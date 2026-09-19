/**
 * Measures exact (brute-force) pgvector search latency over the whole corpus,
 * separating the two costs that people usually conflate:
 *
 *   embed    encoding the query text with the local model
 *   scan     the SQL: a sequential scan of every product embedding, cosine-sorted
 *
 * This is the measurement that decides whether an ANN index (HNSW/IVFFlat) is
 * needed at all. ANN only reduces "scan", and it trades exactness for speed.
 *
 *   yarn workspace @total-guess/ingestion bench:vector [--repeats 3] [--limit 10]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { vectorLiteral } from '../src/embeddings/embedProducts.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';
import { percentile } from '../src/evaluation/metrics.js';
import { filterConditions, type RetrievalFilters } from '../src/retrieval/filters.js';
import { EVAL_QUERIES } from '../evaluation/queries.js';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name: string, fallback: number) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};

const stats = (label: string, values: number[]) => ({
    label,
    samples: values.length,
    mean: round(values.reduce((a, b) => a + b, 0) / values.length),
    p50: round(percentile(values, 50)),
    p95: round(percentile(values, 95)),
    max: round(Math.max(...values)),
});
const round = (n: number) => Math.round(n * 100) / 100;

async function main() {
    const repeats = arg('repeats', 3);
    const limit = arg('limit', 10);
    const db = await openDatabase();
    const embedder = new LocalEmbedder();
    try {
        await embedder.warmUp();
        const { rows: [corpus] } = await db.query<{ products: number; embeddings: number }>(
            `SELECT (SELECT count(*) FROM product)::int AS products,
                    (SELECT count(*) FROM product_embedding WHERE model = $1)::int AS embeddings`, [embedder.id]);

        // A filtered scan has to evaluate the structured predicates as well, so it is measured separately.
        const filters: RetrievalFilters = { minProteinG100: 10, excludeAllergens: ['peanuts'] };
        const embedMs: number[] = [], scanMs: number[] = [], filteredMs: number[] = [];

        for (let round_ = 0; round_ < repeats; round_++) {
            for (const query of EVAL_QUERIES) {
                let t = performance.now();
                const vector = vectorLiteral(await embedder.embedQuery(query.text));
                embedMs.push(performance.now() - t);

                t = performance.now();
                await db.query(
                    `SELECT p.barcode, e.embedding <=> $1::vector AS distance
                     FROM product_embedding e JOIN product p ON p.barcode = e.barcode
                     WHERE e.model = $2 AND e.text_hash = p.text_hash AND e.document_version = p.document_version
                     ORDER BY e.embedding <=> $1::vector, p.barcode LIMIT $3`, [vector, embedder.id, limit]);
                scanMs.push(performance.now() - t);

                const params: unknown[] = [vector, embedder.id];
                const where = ['e.model = $2', 'e.text_hash = p.text_hash', 'e.document_version = p.document_version',
                    ...filterConditions(filters, params)];
                params.push(limit);
                t = performance.now();
                await db.query(
                    `SELECT p.barcode FROM product_embedding e JOIN product p ON p.barcode = e.barcode
                     WHERE ${where.join(' AND ')} ORDER BY e.embedding <=> $1::vector, p.barcode LIMIT $${params.length}`, params);
                filteredMs.push(performance.now() - t);
            }
        }

        const plan = (await db.query<{ 'QUERY PLAN': string }>(
            `EXPLAIN ANALYZE SELECT p.barcode FROM product_embedding e JOIN product p ON p.barcode = e.barcode
             WHERE e.model = $2 AND e.text_hash = p.text_hash AND e.document_version = p.document_version
             ORDER BY e.embedding <=> $1::vector LIMIT 10`,
            [vectorLiteral(await embedder.embedQuery('chicken breast')), embedder.id])).rows.map((r) => r['QUERY PLAN']);

        const report = {
            generatedAt: new Date().toISOString(),
            corpus, model: embedder.id, limit, repeats, queries: EVAL_QUERIES.length,
            index: 'none (exact/brute-force cosine)',
            measurements: [stats('embed query', embedMs), stats('exact scan', scanMs), stats('exact scan + filters', filteredMs),
                stats('end to end', scanMs.map((ms, i) => ms + embedMs[i]!))],
            plan,
        };
        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'vector-latency.json'), JSON.stringify(report, null, 2));
        console.log(`${corpus!.embeddings} embeddings, ${corpus!.products} products, exact search\n`);
        console.log('measurement'.padEnd(24) + ['mean', 'p50', 'p95', 'max'].map((h) => h.padStart(9)).join(''));
        for (const m of report.measurements) {
            console.log(m.label.padEnd(24) + [m.mean, m.p50, m.p95, m.max].map((v) => `${v.toFixed(1)}ms`.padStart(9)).join(''));
        }
    } finally {
        await db.close();
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
