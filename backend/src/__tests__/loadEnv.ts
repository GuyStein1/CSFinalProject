import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test before any test runs so DATABASE_URL is set for Prisma
// override: false — lets CI environment variables take precedence over .env.test
config({ path: resolve(__dirname, '../../../.env.test'), override: false });
