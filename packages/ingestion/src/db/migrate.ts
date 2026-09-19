/**
 * Plain-SQL migrations: src/db/migrations/NNN_name.sql, applied in order,
 * each in its own transaction, recorded in schema_migration. Then reference
 * data (sources, retailers, aliases) is synced from the TypeScript registries,
 * which stay the single source of truth.
 */
import { readdir, readFile } from 'node:fs/promises';
import { DATA_SOURCES } from '../contract/dataSource.js';
import { RETAILER_REGISTRY, normaliseRetailerName, type RetailerId } from '../contract/retailer.js';
import type { Db } from './client.js';

const MIGRATIONS_DIR = new URL('./migrations/', import.meta.url);

export async function migrate(db: Db): Promise<string[]> {
    await db.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const applied = new Set((await db.query<{ version: string }>('SELECT version FROM schema_migration')).rows.map((r) => r.version));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
    const newlyApplied: string[] = [];
    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await readFile(new URL(file, MIGRATIONS_DIR), 'utf8');
        await db.transaction(async (tx) => {
            await tx.exec(sql);
            await tx.query('INSERT INTO schema_migration (version) VALUES ($1)', [file]);
        });
        newlyApplied.push(file);
    }
    await seedReferenceData(db);
    return newlyApplied;
}

export async function seedReferenceData(db: Db): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.query(
            `INSERT INTO data_source (id, name, url, licence, attribution, image_licence, status, status_reason)
             SELECT * FROM jsonb_to_recordset($1::jsonb) AS s(id text, name text, url text, licence text, attribution text,
                                                              image_licence text, status text, status_reason text)
             ON CONFLICT (id) DO UPDATE SET name = excluded.name, url = excluded.url, licence = excluded.licence,
                 attribution = excluded.attribution, image_licence = excluded.image_licence,
                 status = excluded.status, status_reason = excluded.status_reason`,
            [JSON.stringify(Object.values(DATA_SOURCES).map((s) => ({
                id: s.id, name: s.name, url: s.url, licence: s.licence, attribution: s.attribution,
                image_licence: s.imageLicence, status: s.status, status_reason: s.statusReason,
            })))],
        );
        const retailers = Object.entries(RETAILER_REGISTRY) as [RetailerId, { name: string; aliases: readonly string[] }][];
        await tx.query(
            `INSERT INTO retailer (id, name) SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(id text, name text)
             ON CONFLICT (id) DO UPDATE SET name = excluded.name`,
            [JSON.stringify(retailers.map(([id, r]) => ({ id, name: r.name })))],
        );
        await tx.query(
            `INSERT INTO retailer_alias (alias, retailer_id) SELECT * FROM jsonb_to_recordset($1::jsonb) AS a(alias text, retailer_id text)
             ON CONFLICT (alias) DO UPDATE SET retailer_id = excluded.retailer_id`,
            // Several spellings can normalise to one alias ("Marks and Spencer" / "Marks & Spencer").
            [JSON.stringify([...new Map(retailers.flatMap(([id, r]) => r.aliases.map((alias): [string, string] => [normaliseRetailerName(alias), id])))]
                .map(([alias, retailer_id]) => ({ alias, retailer_id })))],
        );
    });
}
