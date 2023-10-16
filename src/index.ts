import { isMainThread } from 'node:worker_threads';

import { hash } from './hash.js';

const entrypoint = new URL(import.meta.url).pathname;

if (isMainThread) {
  const { app } = await import('./app.js');
  app(entrypoint);
} else {
  hash();
}
