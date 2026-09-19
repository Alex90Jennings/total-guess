import { openPglite, type Db } from '../../src/db/client.js';
import { migrate } from '../../src/db/migrate.js';

/** A fresh in-process PostgreSQL (PGlite) with the schema applied. */
export async function createTestDb(): Promise<Db> {
    const db = await openPglite();
    await migrate(db);
    return db;
}

/** Empties every data table, keeping reference data (sources, retailers). */
export async function resetData(db: Db): Promise<void> {
    await db.exec(`TRUNCATE ingestion_rejection, price_observation, reference_price, product_listing, store,
        product_image, product_category, product, source_record, ingestion_run RESTART IDENTITY CASCADE`);
}

export async function count(db: Db, table: string, where = 'true'): Promise<number> {
    const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table} WHERE ${where}`);
    return rows[0]!.n;
}
