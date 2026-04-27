import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { Client } from 'pg';

export default async function globalSetup() {
  // Load test env vars
  // override: false — lets CI environment variables take precedence over .env.test
  config({ path: resolve(__dirname, '../../../.env.test'), override: false });

  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) throw new Error('TEST_DATABASE_URL is not set in .env.test');

  // Extract DB name and build a URL pointing to the default `postgres` DB
  const url = new URL(testDbUrl);
  const dbName = url.pathname.slice(1);
  url.pathname = '/postgres';
  const baseUrl = url.toString();

  // Create the test database if it doesn't already exist
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[test setup] Created database: ${dbName}`);
  }
  await client.end();

  // Run Prisma migrations against the test database
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'), // backend/ dir, where prisma/schema.prisma lives
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
  });
}
