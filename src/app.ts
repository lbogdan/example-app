import { strict as assert } from 'node:assert';
import { hostname } from 'node:os';
import { setTimeout as setTimeoutAsync } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';

import Koa from 'koa';
import Router from '@koa/router';

import { config, watchConfig } from './config.js';
import { hashSync } from './hash.js';

import type { Next } from 'koa';
import type { RouterContext } from '@koa/router';

const envPort = process.env['PORT'];
const PORT = envPort ? parseInt(envPort) : 3000;
const ASYNC_QUEUE = process.env['ASYNC_QUEUE'] !== '0';
let healthy = true;

function response(ctx: RouterContext, res: object): void {
  ctx.body = {
    ...res,
    metadata: {
      environment: config.environment,
      hostname: hostname(),
      version: config.version,
    },
  };
}

async function signalHandler(signal: NodeJS.Signals): Promise<void> {
  console.log(`got signal ${signal}, cleaning up`);
  await setTimeoutAsync(5000);
  process.exit();
}

async function logMiddleware(ctx: RouterContext, next: Next): Promise<void> {
  // const routeName = ctx._matchedRouteName;
  const log = true; // routeName !== 'health' && routeName !== 'live';
  if (log) {
    console.log(ctx.method, ctx.url);
  }
  const start = new Date().getTime();
  try {
    await next();
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = {
      error: err instanceof Error ? err.message : JSON.stringify(err),
    };
  }
  const elapsed = new Date().getTime() - start;
  if (log) {
    console.log(
      ctx.method,
      ctx.url,
      ctx.status,
      ctx._matchedRouteName,
      elapsed
    );
  }
}

export async function app(entrypoint: string): Promise<void> {
  const app = new Koa();
  const router = new Router();

  const db =
    config.dbType === 'sqlite'
      ? await import('./db/sqlite.js')
      : await import('./db/postgres.js');

  router.get('hash', '/hash/:message', async (ctx) => {
    const message = ctx.params['message'];
    assert(message, 'message is not set');
    if (ASYNC_QUEUE) {
      const hash = await new Promise((resolve) => {
        const worker = new Worker(/* './src/hash.ts' */ entrypoint, {
          workerData: JSON.stringify({
            password: message,
            rounds: config.rounds,
          }),
        });
        worker.on('message', resolve);
        worker.on('exit', (code) =>
          console.log(`worker exited with code ${code}`)
        );
      });
      response(ctx, { hash, message });
    } else {
      response(ctx, { hash: hashSync(message, config.rounds), message });
    }
  });

  router.get('live', '/livez', (ctx) => {
    ctx.body = 'OK';
  });

  router.get('health', '/healthz', (ctx) => {
    if (!healthy) {
      ctx.status = 500;
      return;
    }

    ctx.body = 'OK';
  });

  router.get('counter', '/counter/:id', async (ctx) => {
    const id = ctx.params['id'];
    assert(id, 'id is not set');
    const counter = await db.get(parseInt(id));
    if (counter !== undefined) {
      response(ctx, { counter });
    } else {
      ctx.status = 404;
    }
  });

  router.get('counter-increment', '/counter/:id/inc', async (ctx) => {
    const id = ctx.params['id'];
    assert(id, 'id is not set');
    const counter = await db.increment(parseInt(id));
    if (counter) {
      response(ctx, { counter });
    } else {
      ctx.status = 404;
    }
  });

  router.get('/error', async () => {
    await setTimeoutAsync(500);
    throw new Error('error endpoint');
  });

  router.get('/health-fail', (ctx) => {
    const failFor = ctx.query['for'];
    assert(typeof failFor === 'string', 'for is not set');
    healthy = false;
    setTimeout(
      () => {
        healthy = true;
      },
      parseInt(failFor) * 1000
    );
    response(ctx, { message: `health check failing for next ${failFor}s` });
  });

  app
    .use(logMiddleware)
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, () => {
      console.log(`listening on http://localhost:${PORT}/`);
    });

  await db.createTable();

  watchConfig();

  if (config.environment !== 'development') {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on('SIGINT', signalHandler);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on('SIGTERM', signalHandler);
  }
}
