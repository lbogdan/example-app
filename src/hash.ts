import { parentPort, workerData } from 'node:worker_threads';

import bcryptjs from 'bcryptjs';

export function hash(): void {
  const { password, rounds } = JSON.parse(workerData as string) as {
    password: string;
    rounds: number;
  };

  const hashedPassword = hashSync(password, rounds);

  parentPort?.postMessage(hashedPassword);
}

export function hashSync(password: string, rounds: number): string {
  const hashedPassword = bcryptjs.hashSync(password, rounds);
  for (let i = 0; i < 1; i++) {
    if (!bcryptjs.compareSync(password, hashedPassword)) {
      throw new Error('invalid hash');
    }
  }
  return hashedPassword;
}
