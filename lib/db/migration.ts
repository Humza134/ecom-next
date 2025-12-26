import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config({ path: ".env" });

/**
 * Validates environment variables before running migrations
 */
const validateEnvironment = (): void => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for migrations');
  }
};

/**
 * Run migrations on the database
 */
export const runMigrations = async () => {
  console.log('Validating environment...');
  validateEnvironment();
  
  console.log('Running migrations...');
  
  try {
    await migrate(db, { 
      migrationsFolder: './drizzle', // Folder where generated migrations are stored
      migrationsTable: '__drizzle_migrations'  // Table to track applied migrations
    });
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Execute migrations if this file is run directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}