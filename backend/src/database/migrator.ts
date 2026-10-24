import fs from 'fs';
import path from 'path';
import { getDbPool } from './connection';
import { logger } from '../utils/logger';

export const runMigrations = async (): Promise<boolean> => {
  const pool = getDbPool();
  if (!pool) {
    logger.warn('Cannot run database migrations: PostgreSQL connection pool unavailable.');
    return false;
  }

  const client = await pool.connect();
  try {
    logger.info('Starting AEGIS database migrations...');

    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found at ${migrationsDir}`);
      return false;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file]
      );

      if (checkRes.rowCount === 0) {
        logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        logger.info(`Successfully applied migration: ${file}`);
      } else {
        logger.info(`Migration already applied: ${file}`);
      }
    }

    logger.info('All database migrations applied successfully.');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to run database migrations:', { error: err.message });
    return false;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  runMigrations()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}
