import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema/schemas';
import 'dotenv/config';

// Change 3: HTTP connection ki jagah Pool banayein
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Ab ye DB transactions support karega
export const db = drizzle(pool, { schema });

export { pool };