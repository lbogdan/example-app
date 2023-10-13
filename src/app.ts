import { hostname } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';

// import { compareSync, hashSync } from 'bcryptjs';
import Koa from 'koa';
import Router from '@koa/router';

import { config, watchConfig } from './config.js';
import { hashSync } from './hash.js';

import type { RouterContext } from '@koa/router';

const envPort = process.env['PORT'];
const PORT = envPort ? parseInt(envPort) : 3000;
const ASYNC_QUEUE = process.env['ASYNC_QUEUE'] !== '0';

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

export function app(entrypoint: string): void {
  const app = new Koa();
  const router = new Router();

  router.get('/', async (ctx) => {
    await setTimeout(1000);
    ctx.body = 'OK';
  });

  router.get('/hash', async (ctx) => {
    const password = 'foobarbaz';
    // const hashedPassword = hashSync(password, 16);
    // for (let i = 0; i < 1; i++) {
    //   if (!compareSync(password, hashedPassword)) {
    //     throw new Error('invalid hash');
    //   }
    // }
    // ctx.body = hashedPassword;
    if (ASYNC_QUEUE) {
      const hash = await new Promise((resolve) => {
        const worker = new Worker(/* './src/hash.ts' */ entrypoint, {
          workerData: JSON.stringify({ password, rounds: config.rounds }),
        });
        worker.on('message', resolve);
        worker.on('exit', (code) =>
          console.log(`worker exited with code ${code}`)
        );
      });
      response(ctx, { hash });
    } else {
      response(ctx, { hash: hashSync(password, config.rounds) });
    }
  });

  router.get('/livez', (ctx) => {
    ctx.body = 'OK';
  });

  app
    .use(router.routes())
    .use(router.allowedMethods())
    .listen(PORT, () => {
      console.log(`listening on http://localhost:${PORT}/`);
    });

  watchConfig();
}
