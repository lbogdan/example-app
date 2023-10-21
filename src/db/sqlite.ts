import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { config } from '../config.js';

const dbPath = config.sqliteDbPath ?? 'db.sqlite';

const db = await open({
  filename: dbPath,
  driver: sqlite3.Database,
});

export async function createTable(): Promise<void> {
  await db.exec(`
CREATE TABLE IF NOT EXISTS counters (
  id INTEGER PRIMARY KEY,
  counter INTEGER NOT NULL
)
`);

  await db.exec(`
INSERT INTO counters (id, counter)
SELECT 1, 0
WHERE NOT EXISTS (SELECT id FROM counters WHERE id=1)
`);
}

export async function get(id: number): Promise<number | undefined> {
  const res = await db.get<{ counter: number }>(
    `SELECT counter FROM counters WHERE id=${id}`
  );

  if (!res) {
    return;
  }

  return res.counter;
}

export async function increment(id: number): Promise<number | undefined> {
  const res = await db.get<{ id: number; counter: number }>(
    `UPDATE counters SET counter=counter+1 WHERE id=${id} RETURNING *`
  );

  if (!res) {
    return;
  }

  return res.counter;
}

export default {
  createTable,
  get,
  increment,
};
