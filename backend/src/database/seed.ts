import { getDbPool } from './connection';
import { inMemoryStore } from './inMemoryStore';
import { logger } from '../utils/logger';

export const seedDatabase = async (): Promise<boolean> => {
  const pool = getDbPool();
  if (!pool) {
    logger.warn('PostgreSQL pool not available for seeding, relying on in-memory store.');
    return false;
  }

  const client = await pool.connect();
  try {
    logger.info('Seeding database with authentic Chennai emergency data...');
    await client.query('BEGIN');

    // 1. Seed nearby facilities
    for (const fac of inMemoryStore.facilities) {
      await client.query(
        `INSERT INTO nearby_facilities (
          id, provider, external_place_id, category, name, latitude, longitude, phone_number, address, is_emergency_service, verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING`,
        [
          fac.id,
          fac.provider,
          fac.external_place_id,
          fac.category,
          fac.name,
          fac.latitude,
          fac.longitude,
          fac.phone_number,
          fac.address,
          fac.is_emergency_service,
          fac.verified_at
        ]
      );
    }

    // 2. Seed safety data
    for (const s of inMemoryStore.safetyData) {
      await client.query(
        `INSERT INTO safety_data (
          id, source, category, latitude, longitude, confidence, safety_score, metadata, observed_at, imported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.source,
          s.category,
          s.latitude,
          s.longitude,
          s.confidence,
          s.safety_score,
          JSON.stringify(s.metadata),
          s.observed_at,
          s.imported_at
        ]
      );
    }

    // 3. Seed demo user and contacts
    for (const user of inMemoryStore.users.values()) {
      await client.query(
        `INSERT INTO users (
          id, firebase_uid, display_name, verified_phone_number, medical_notes, account_status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING`,
        [
          user.id,
          user.firebase_uid,
          user.display_name,
          user.verified_phone_number,
          user.medical_notes,
          user.account_status
        ]
      );
    }

    for (const contact of inMemoryStore.contacts.values()) {
      await client.query(
        `INSERT INTO emergency_contacts (
          id, user_id, display_name, phone_number, relationship, is_primary, can_receive_alerts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING`,
        [
          contact.id,
          contact.user_id,
          contact.display_name,
          contact.phone_number,
          contact.relationship,
          contact.is_primary,
          contact.can_receive_alerts
        ]
      );
    }

    await client.query('COMMIT');
    logger.info('Database seeded successfully.');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to seed database:', { error: err.message });
    return false;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seedDatabase()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}
