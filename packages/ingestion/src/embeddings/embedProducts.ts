/**
 * Embeds products' semantic documents (v2) into product_embedding.
 *
 * - Batched: `batchSize` products per embedding call and per transaction.
 * - Idempotent: a product is skipped when an embedding exists for the same
 *   model, document version and text_hash.
 * - Restartable and safe to interrupt: each batch commits on its own, and the
 *   next run picks up whatever is still missing or stale. `shouldStop` lets a
 *   caller (e.g. a SIGINT handler) end the run after the current batch.
 * - Observable: an ingestion_run row with counts and timings, and progress callbacks.
 *
 * Before embedding, the document rebuilt from the database must hash to the
 * product's stored text_hash; otherwise the product is reported, not embedded.
 */
import type { Db } from '../db/client.js';
import { readProductRecords } from '../db/catalogueRepository.js';
import { finishRun, startRun } from '../db/ingestionRuns.js';
import { buildProductDocument, DOCUMENT_VERSION, productTextHash } from '../documents/productDocument.js';
import type { Embedder } from './embedder.js';

export type EmbedStats = {
    runId: string;
    model: string;
    total: number;
    alreadyFresh: number;
    embedded: number;
    failed: number;
    failures: { barcode: string; reason: string }[];
    stoppedEarly: boolean;
    durationMs: number;
    embedMs: number;
    productsPerSecond: number;
};

export function vectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
}

const STALE = `NOT EXISTS (SELECT 1 FROM product_embedding e WHERE e.barcode = p.barcode AND e.model = $1
    AND e.text_hash = p.text_hash AND e.document_version = p.document_version AND e.dimensions = $2)`;

export async function embedProducts(
    db: Db,
    embedder: Embedder,
    options: { batchSize?: number; limit?: number; onProgress?: (s: EmbedStats) => void; shouldStop?: () => boolean } = {},
): Promise<EmbedStats> {
    const started = Date.now();
    const batchSize = Math.min(options.batchSize ?? 64, embedder.maxBatchSize * 4);
    const runId = await startRun(db, 'open_food_facts', 'embed_products', { model: embedder.id, dimensions: embedder.dimensions, batchSize });
    const total = Number((await db.query<{ n: number }>('SELECT count(*) AS n FROM product')).rows[0]!.n);
    const pending = Number((await db.query<{ n: number }>(`SELECT count(*) AS n FROM product p WHERE ${STALE}`, [embedder.id, embedder.dimensions])).rows[0]!.n);
    const stats: EmbedStats = {
        runId, model: embedder.id, total, alreadyFresh: total - pending, embedded: 0, failed: 0, failures: [],
        stoppedEarly: false, durationMs: 0, embedMs: 0, productsPerSecond: 0,
    };
    const failed: string[] = [];

    try {
        for (;;) {
            if (options.shouldStop?.() || (options.limit !== undefined && stats.embedded >= options.limit)) {
                stats.stoppedEarly = stats.embedded + stats.failed < pending;
                break;
            }
            const { rows } = await db.query<{ barcode: string; text_hash: string }>(
                `SELECT p.barcode, p.text_hash FROM product p WHERE ${STALE} AND p.barcode <> ALL($3::text[])
                 ORDER BY p.barcode LIMIT $4`,
                [embedder.id, embedder.dimensions, failed, batchSize],
            );
            if (!rows.length) break;

            const records = await readProductRecords(db, rows.map((r) => r.barcode));
            const batch: { barcode: string; textHash: string; document: string }[] = [];
            for (const row of rows) {
                const record = records.get(row.barcode);
                const reason = !record ? 'missing' : !record.ok ? `invalid: ${record.errors[0]}`
                    : productTextHash(record.value.product) !== row.text_hash ? 'text_hash_mismatch' : null;
                if (reason || !record?.ok) {
                    failed.push(row.barcode);
                    stats.failures.push({ barcode: row.barcode, reason: reason ?? 'unknown' });
                    continue;
                }
                batch.push({ barcode: row.barcode, textHash: row.text_hash, document: buildProductDocument(record.value.product) });
            }
            if (!batch.length) continue;

            const t = Date.now();
            let vectors: number[][];
            try {
                vectors = await embedder.embedDocuments(batch.map((b) => b.document));
            } catch (error) {
                for (const b of batch) {
                    failed.push(b.barcode);
                    stats.failures.push({ barcode: b.barcode, reason: `embedder: ${error instanceof Error ? error.message : String(error)}` });
                }
                continue;
            }
            stats.embedMs += Date.now() - t;
            if (vectors.length !== batch.length || vectors.some((v) => v.length !== embedder.dimensions)) {
                throw new Error(`embedder returned ${vectors.length} vectors for ${batch.length} documents, or wrong dimensions`);
            }

            await db.query(
                `INSERT INTO product_embedding (barcode, model, dimensions, document_version, text_hash, embedding, run_id)
                 SELECT barcode, $1, $2, $3, text_hash, embedding::vector, $4
                 FROM jsonb_to_recordset($5::jsonb) AS r(barcode char(14), text_hash text, embedding text)
                 ON CONFLICT (barcode, model) DO UPDATE SET dimensions = excluded.dimensions,
                     document_version = excluded.document_version, text_hash = excluded.text_hash,
                     embedding = excluded.embedding, embedded_at = now(), run_id = excluded.run_id`,
                [embedder.id, embedder.dimensions, DOCUMENT_VERSION, runId,
                    JSON.stringify(batch.map((b, i) => ({ barcode: b.barcode, text_hash: b.textHash, embedding: vectorLiteral(vectors[i]!) })))],
            );
            stats.embedded += batch.length;
            stats.durationMs = Date.now() - started;
            options.onProgress?.(stats);
        }
        stats.failed = stats.failures.length;
        stats.durationMs = Date.now() - started;
        stats.productsPerSecond = Math.round((stats.embedded * 1000) / Math.max(1, stats.durationMs));
        await finishRun(db, runId, { stats: { ...stats, failures: stats.failures.slice(0, 100) } });
        return stats;
    } catch (error) {
        stats.durationMs = Date.now() - started;
        await finishRun(db, runId, { stats: { ...stats, failures: stats.failures.slice(0, 100) }, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}
