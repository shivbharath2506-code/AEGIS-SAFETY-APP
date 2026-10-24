import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

let pool: Pool | null = null;
let isPostgresConnected = false;

export const getDbPool = (): Pool | null => {
  if (pool) return pool;

  try {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      min: 1,
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      logger.warn('PostgreSQL pool background error (falling back to memory store if needed):', {
        error: err.message
      });
      isPostgresConnected = false;
    });

    return pool;
  } catch (err: any) {
    logger.warn('Could not initialize PostgreSQL pool, using in-memory store:', {
      error: err.message
    });
    return null;
  }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
  const currentPool = getDbPool();
  if (!currentPool) return false;

  try {
    const client = await currentPool.connect();
    await client.query('SELECT 1');
    client.release();
    isPostgresConnected = true;
    logger.info('Connected successfully to PostgreSQL database with PostGIS readiness.');
    return true;
  } catch (err: any) {
    isPostgresConnected = false;
    logger.warn('PostgreSQL connection check failed, operating with in-memory persistence layer:', {
      message: err.message
    });
    return false;
  }
};

export const isDbConnected = (): boolean => isPostgresConnected;
