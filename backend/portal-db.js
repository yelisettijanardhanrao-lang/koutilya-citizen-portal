import 'dotenv/config';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'backend', 'portal-data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const initial = {
  users: [],
  sessions: [],
  transactions: [],
  complaints: [],
  chats: [],
  cashfreeOrders: [],
  applications: [],
  counters: {
    user: 3411,
    complaint: 1000
  }
};

function normalizeDb(db) {
  return {
    ...initial,
    ...db,
    counters: {
      ...initial.counters,
      ...(db?.counters || {})
    },
    users: db?.users || [],
    sessions: db?.sessions || [],
    transactions: db?.transactions || [],
    complaints: db?.complaints || [],
    chats: db?.chats || [],
    cashfreeOrders: db?.cashfreeOrders || [],
    applications: db?.applications || []
  };
}

/*
 * PostgreSQL is used whenever DATABASE_URL exists.
 * If DATABASE_URL is absent, the original JSON database is used.
 */

const usePostgres = Boolean(process.env.DATABASE_URL);

let pool = null;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('POSTGRES POOL ERROR:', err.message);
  });
}

async function initPostgres() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_db_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const result = await pool.query(
    'SELECT id FROM portal_db_state WHERE id = 1'
  );

  if (result.rowCount === 0) {
    await pool.query(
      `INSERT INTO portal_db_state (id, data)
       VALUES ($1, $2::jsonb)`,
      [1, JSON.stringify(initial)]
    );
  }
}

export async function initDb() {
  if (usePostgres) {
    await initPostgres();
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  if (!fsSync.existsSync(DB_FILE)) {
    await fs.writeFile(
      DB_FILE,
      JSON.stringify(initial, null, 2)
    );
  }
}

async function readPostgres() {
  await initPostgres();

  const result = await pool.query(
    'SELECT data FROM portal_db_state WHERE id = 1'
  );

  return normalizeDb(result.rows[0]?.data || initial);
}

async function readJson() {
  await initDb();

  return normalizeDb(
    JSON.parse(
      await fs.readFile(DB_FILE, 'utf8')
    )
  );
}

async function read() {
  if (usePostgres) {
    return readPostgres();
  }

  return readJson();
}

let writeQueue = Promise.resolve();

async function writeJson(db) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(
      DB_FILE,
      JSON.stringify(db, null, 2)
    )
  );

  return writeQueue;
}

async function writePostgres(db) {
  await initPostgres();

  await pool.query(
    `UPDATE portal_db_state
     SET data = $1::jsonb,
         updated_at = NOW()
     WHERE id = 1`,
    [JSON.stringify(normalizeDb(db))]
  );
}

async function write(db) {
  if (usePostgres) {
    return writePostgres(db);
  }

  return writeJson(db);
}

export async function mutate(fn) {
  /*
   * Keep writes serialized inside this Node process,
   * just like the original JSON implementation.
   */
  writeQueue = writeQueue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });

  return writeQueue;
}

export async function getDb() {
  return read();
}

export function id(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(9).toString('hex')}`;
}

export function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(String(password))
    .digest('hex');
}

export function randomPassword() {
  return crypto
    .randomBytes(4)
    .toString('base64url')
    .slice(0, 8);
}

export function now() {
  return new Date().toISOString();
}