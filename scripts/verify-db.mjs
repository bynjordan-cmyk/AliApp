/** Disposable database, portable across Windows/Linux. Never resets existing data. */
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { Client } from 'pg';

const connection = new URL(
  process.env.ALIAPP_TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:55432/postgres',
);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname)) {
  throw new Error('This verification script only accepts a local Postgres instance.');
}
connection.pathname = '/postgres';
const admin = new Client({ connectionString: connection.toString() });
const name = `aliapp_verify_${randomBytes(8).toString('hex')}`;
await admin.connect();
let created = false;
try {
  await admin.query(`create database "${name}"`);
  created = true;
  connection.pathname = `/${name}`;
  const db = new Client({ connectionString: connection.toString() });
  await db.connect();
  try {
    await db.query(await readFile('tests/db/supabase-shim.sql', 'utf8'));
    const migrations = (await readdir('supabase/migrations'))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of migrations)
      await db.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
    await db.query(await readFile('supabase/seed.sql', 'utf8'));
    console.log(`Applied ${migrations.length} migrations and seed to a fresh local database.`);
  } finally {
    await db.end();
  }
  const status = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['node_modules/jest/bin/jest.js', '--config', 'jest.rls.config.js', '--runInBand'],
      {
        stdio: 'inherit',
        env: { ...process.env, ALIAPP_TEST_DATABASE_URL: connection.toString() },
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = status;
} finally {
  // Only the random database created by this invocation is ever dropped.
  if (created) await admin.query(`drop database "${name}" with (force)`);
  await admin.end();
}
