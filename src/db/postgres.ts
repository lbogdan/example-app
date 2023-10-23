import pg from 'pg';

import { config } from '../config.js';

const postgresPassword = process.env['POSTGRES_PASSWORD'];
if (!postgresPassword) {
  throw new Error('POSTGRES_PASSWORD not set');
}

const client = new pg.Client({
  host: config.postgresHost,
  user: config.postgresUser,
  database: config.postgresDb,
  password: postgresPassword,
  connectionTimeoutMillis: 1000,
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

export async function increment(
  id: number,
  delta: number
): Promise<number | undefined> {
  const res = await client.query<{ id: number; counter: number }>(
    `UPDATE counters SET counter=counter+${delta} WHERE id=${id} RETURNING *`
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
