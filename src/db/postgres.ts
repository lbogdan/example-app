import pg from 'pg';

import { config } from '../config.js';

const client = new pg.Client({
  // host: 'test-rw.default',
  user: config.postgresUser,
  // password: 'VDhtfD2dc7XGc54EMmNUdasuZ6QQqHsRu4NoBevXiVXQUY4mz09RxflCkMRw3IWO',
  database: config.postgresDb,
  host: 'example-app-postgresql',
  password: 'abcd1234',
});

await client.connect();
console.log('connected to db');

export async function createTable(): Promise<void> {
  await client.query(`
CREATE TABLE IF NOT EXISTS counters (
  id INT PRIMARY KEY,
  counter INT NOT NULL
);
`);

  await client.query(`
INSERT INTO counters (id, counter)
SELECT 1, 0
WHERE NOT EXISTS (SELECT id FROM counters WHERE id=1)
`);
}

export async function get(id: number): Promise<number | undefined> {
  const res = await client.query<{ counter: number }>(
    `SELECT counter FROM counters WHERE id=${id}`
  );

  if (res.rowCount === 0) {
    return;
  }

  return res.rows[0]!.counter;
}

export async function increment(id: number): Promise<number | undefined> {
  const res = await client.query<{ id: number; counter: number }>(
    `UPDATE counters SET counter=counter+1 WHERE id=${id} RETURNING *`
  );

  if (res.rowCount === 0) {
    return;
  }

  return res.rows[0]!.counter;
}

export default {
  createTable,
  get,
  increment,
};
