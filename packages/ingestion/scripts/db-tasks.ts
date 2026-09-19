/**
 * Small database tasks:
 *
 *   db:migrate          apply migrations and sync reference data
 *   prices:import       persist the captured Open Prices GBP observations (.captures/openprices/gbp-p*.json)
 *   curated:import      persist the legacy curated catalogue (src/data/items.js)
 *   off:replay          rebuild products from stored source records (no dump needed)
 *
 * Uses DATABASE_URL if set, otherwise a local PGlite database in .data/pglite.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { migrate } from '../src/db/migrate.js';
import { replayOffProducts } from '../src/ingest/offImport.js';
import { importCurated, importOpenPrices } from '../src/ingest/priceAndCuratedImport.js';

const here = dirname(fileURLToPath(import.meta.url));
const utc = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

async function main() {
    const task = process.argv[2];
    const db = await openDatabase();
    try {
        const applied = await migrate(db);
        switch (task) {
            case 'migrate':
                console.log(JSON.stringify({ applied }, null, 2));
                break;
            case 'prices': {
                const dir = join(here, '..', '.captures', 'openprices');
                if (!existsSync(dir)) throw new Error(`no Open Prices captures in ${dir}; run feasibility:fetch first`);
                const items = readdirSync(dir).filter((f) => /^gbp-p\d+\.json$/.test(f)).flatMap((f) => {
                    const path = join(dir, f);
                    const importedAt = utc(statSync(path).mtime); // when the page was fetched
                    return (JSON.parse(readFileSync(path, 'utf8')).items as unknown[]).map((raw) => ({ raw, importedAt }));
                });
                console.log(JSON.stringify(await importOpenPrices(db, items), null, 2));
                break;
            }
            case 'curated': {
                const path = resolve(here, '../../../src/data/items.js');
                const { items } = await import(path) as { items: unknown[] };
                console.log(JSON.stringify(await importCurated(db, items, utc(statSync(path).mtime)), null, 2));
                break;
            }
            case 'replay':
                console.log(JSON.stringify(await replayOffProducts(db), null, 2));
                break;
            default:
                throw new Error('usage: db-tasks.ts migrate | prices | curated | replay');
        }
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
