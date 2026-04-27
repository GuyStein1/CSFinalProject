import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test before any test runs so DATABASE_URL is set for Prisma
config({ path: resolve(__dirname, '../../../.env.test'), override: true });
