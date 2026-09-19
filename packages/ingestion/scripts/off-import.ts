/**
 * Stage 2 of the Open Food Facts import (offline, repeatable): read the
 * trimmed UK extract written by off-extract.ts and load the corpus.
 *
 *   yarn workspace @total-guess/ingestion off:import [--file uk-YYYY-MM-DD.jsonl.gz] [--max-products 25000] [--batch-size 500]
 *
 * Uses DATABASE_URL if set, otherwise a local PGlite database in .data/pglite.
 */
import { createReadStream, existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import { openDatabase } from '../src/db/client.js';
import { migrate } from '../src/db/migrate.js';
import { importOffRecords } from '../src/ingest/offImport.js';

const here = dirname(fileURLToPath(import.meta.url));
const dumpDir = join(here, '..', '.captures', 'openfoodfacts', 'dump');
const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

function latestExtract(): string {
    const files = existsSync(dumpDir) ? readdirSync(dumpDir).filter((f) => /^uk-.*\.jsonl\.gz$/.test(f)).sort() : [];
    if (!files.length) throw new Error(`no extract in ${dumpDir}; run off:extract first`);
    return join(dumpDir, files.at(-1)!);
}

async function* readRecords(path: string): AsyncIterable<Record<string, unknown>> {
    const input = createReadStream(path);
    const lines = createInterface({ input: path.endsWith('.gz') ? input.pipe(createGunzip()) : input, crlfDelay: Infinity });
    for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

async function main() {
    const file = arg('file') ? join(dumpDir, arg('file')!) : latestExtract();
    const summaryPath = file.replace(/\.jsonl(\.gz)?$/, '.summary.json');
    // Provenance.importedAt is when the data was fetched: the extraction run.
    const importedAt = existsSync(summaryPath)
        ? new Date(JSON.parse(readFileSync(summaryPath, 'utf8')).finishedAt).toISOString().replace(/\.\d{3}Z$/, 'Z')
        : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    const db = await openDatabase();
    try {
        await migrate(db);
        const summary = await importOffRecords(db, () => readRecords(file), {
            importedAt,
            maxProducts: arg('max-products') ? Number(arg('max-products')) : undefined,
            batchSize: arg('batch-size') ? Number(arg('batch-size')) : undefined,
        });
        console.log(JSON.stringify({ file, ...summary }, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
