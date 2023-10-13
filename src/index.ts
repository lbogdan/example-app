import { isMainThread } from 'node:worker_threads';

import { app } from './app.js';
import { hash } from './hash.js';

const entrypoint = new URL(import.meta.url).pathname;

if (isMainThread) {
  app(entrypoint);
} else {
  hash();
}
