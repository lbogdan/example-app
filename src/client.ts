import { setTimeout as setTimeoutAsync } from 'node:timers/promises';
import { basename } from 'node:path';

const queue: Map<number, Promise<number>> = new Map();
let queueIndex = 0;

async function addQueue(promise: Promise<void>): Promise<void> {
  if (queueSize === 1) {
    await promise;
    return;
  }

  if (queue.size >= queueSize - 1) {
    const i = await Promise.race(queue.values());
    queue.delete(i);
  }
  queue.set(
    queueIndex,
    (async (i: number): Promise<number> => {
      await promise;
      return i;
    })(queueIndex)
  );
  queueIndex += 1;
}

interface Metadata {
  environment: string;
  hostname: string;
  version: string;
}

interface HashResponse {
  hash: string;
  message: string;
  metadata: Metadata;
}

interface CounterResponse {
  counter: number;
  metadata: Metadata;
}

async function hash(hostname: string, i: number): Promise<void> {
  const start = new Date().getTime();
  const res = await fetch(`http://${hostname}/hash/test`);
  if (res.status === 200) {
    const data = (await res.json()) as HashResponse;
    const { metadata: m } = data;
    const elapsed = new Date().getTime() - start;
    console.log(
      `#${i} | ${m.environment} | ${m.version} | ${m.hostname} | ${elapsed}ms`
    );
  } else {
    console.log(`#${i} | http response: ${res.status}`);
    await setTimeoutAsync(500);
  }
}

async function counter(hostname: string, i: number): Promise<void> {
  const start = new Date().getTime();
  const res = await fetch(`http://${hostname}/counter/1/inc`);
  if (res.status === 200) {
    const data = (await res.json()) as CounterResponse;
    const { metadata: m } = data;
    const elapsed = new Date().getTime() - start;
    console.log(
      `#${i} | counter: ${data.counter} | ${m.environment} | ${m.version} | ${m.hostname} | ${elapsed}ms`
    );
  } else {
    console.log(`#${i} | http response: ${res.status}`);
    await setTimeoutAsync(500);
  }
}

if (process.argv.length < 5 || process.argv.length > 6) {
  console.error(
    `Usage: ${basename(
      process.argv[1]!
    )} HOSTNAME hash|counter PARALLEL_REQUESTS [DELAY]`
  );
  process.exit(1);
}

const hostname = process.argv[2]!;
const reqType = process.argv[3]!;
const queueSize = parseInt(process.argv[4]!);
let delay = 0;
const delayStr = process.argv[5];
if (delayStr) {
  delay = parseInt(delayStr);
}

let i = 1;
// eslint-disable-next-line no-constant-condition
while (true) {
  await addQueue(
    (async (i: number): Promise<void> => {
      if (reqType === 'hash') {
        await hash(hostname, i);
      } else {
        await counter(hostname, i);
      }
      await setTimeoutAsync(delay * 1000);
    })(i++)
  );
}
