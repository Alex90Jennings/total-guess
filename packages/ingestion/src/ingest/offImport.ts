/**
 * Open Food Facts -> catalogue, from trimmed dump records (see
 * sources/openFoodFacts/dump.ts). Two passes over the records:
 *
 *   1. classify: gate, map and tier every candidate; resolve duplicate GTINs;
 *      choose the corpus (Tier A first, then B, most-scanned first, capped).
 *   2. persist: map the chosen records again and batch-upsert source records,
 *      products, categories and images, one transaction per batch.
 *
 * Everything not chosen is recorded in ingestion_rejection with reason codes.
 */
import { hasCompleteLabelNutrition, type ProductRecord } from '../contract/index.js';
import type { Db } from '../db/client.js';
import { upsertProducts, upsertSourceRecords, type ProductInput, type SourceRecordInput, type Tier } from '../db/catalogueRepository.js';
import { finishRun, recordRejections, startRun, type Rejection } from '../db/ingestionRuns.js';
import { OFF_PAYLOAD_VERSION } from '../sources/openFoodFacts/dump.js';
import { mapOffProduct, OFF_MAPPER_VERSION } from '../sources/openFoodFacts/mapProduct.js';
import { assessQuality, gateRecord, type QualityCheck } from '../sources/openFoodFacts/quality.js';

type Raw = Record<string, unknown>;
export type RecordSource = () => AsyncIterable<Raw>;

export type OffImportOptions = {
    /** When the records were fetched (Provenance.importedAt), e.g. the dump download time. */
    importedAt: string;
    maxProducts?: number;
    batchSize?: number;
    acceptTiers?: Tier[];
    kind?: string;
};

const TIER_RANK: Record<Tier, number> = { A: 0, B: 1, C: 2 };

type Candidate = { code: string; barcode: string; tier: Tier; failed: QualityCheck[]; scans: number; modified: number };

/** Coverage counters over every product that passed the gates. */
export type CandidateStats = {
    mapped: number;
    tiers: Record<Tier, number>;
    checksPassed: Record<string, number>;
    englishIngredients: number;
    completeNutrition: number;
    proteinPresent: number;
    allergensListed: number;
    dietaryClaim: number;
    dietaryInference: number;
    description: number;
    quantityKinds: Record<string, number>;
};

export type OffImportSummary = {
    runId: string;
    source: 'open_food_facts';
    kind: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    recordsScanned: number;
    candidates: number;
    accepted: number;
    rejected: number;
    rejectionsByCode: Record<string, number>;
    warningsByCode: Record<string, number>;
    duplicateGtins: number;
    candidateStats: CandidateStats;
    sourceRecords: { inserted: number; updated: number; unchanged: number };
    products: { inserted: number; updated: number; unchanged: number; textChanged: number };
    timingsMs: { classify: number; persist: number; dbWrite: number };
    recordsPerSecond: number;
};

const bump = (map: Record<string, number>, key: string, by = 1) => { map[key] = (map[key] ?? 0) + by; };
const warningCode = (w: string) => w.split(':')[0]!.trim();

export async function importOffRecords(db: Db, open: RecordSource, options: OffImportOptions): Promise<OffImportSummary> {
    const started = Date.now();
    const kind = options.kind ?? 'off_dump_import';
    const acceptTiers = new Set(options.acceptTiers ?? ['A', 'B']);
    const maxProducts = options.maxProducts ?? 25_000;
    const batchSize = options.batchSize ?? 500;
    const runId = await startRun(db, 'open_food_facts', kind, { maxProducts, batchSize, acceptTiers: [...acceptTiers], importedAt: options.importedAt });

    try {
        // ---- pass 1: classify ----
        const rejections: Rejection[] = [];
        const warningsByCode: Record<string, number> = {};
        const stats: CandidateStats = {
            mapped: 0, tiers: { A: 0, B: 0, C: 0 }, checksPassed: {}, englishIngredients: 0, completeNutrition: 0,
            proteinPresent: 0, allergensListed: 0, dietaryClaim: 0, dietaryInference: 0, description: 0, quantityKinds: {},
        };
        const best = new Map<string, Candidate>();
        let scanned = 0;
        let duplicates = 0;

        const better = (a: Candidate, b: Candidate) =>
            TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.scans - a.scans || b.modified - a.modified || a.code.localeCompare(b.code);

        for await (const raw of open()) {
            scanned++;
            const code = String(raw.code ?? '');
            const gate = gateRecord(raw);
            if (gate) {
                rejections.push({ sourceRecordId: code || `(line ${scanned})`, reasonCodes: [gate] });
                continue;
            }
            const mapped = mapOffProduct(raw, { importedAt: options.importedAt });
            for (const w of mapped.warnings) bump(warningsByCode, warningCode(w));
            if (!mapped.ok) {
                rejections.push({ sourceRecordId: code, reasonCodes: ['mapper_rejected'], detail: mapped.errors.join('; ') });
                continue;
            }
            const record = mapped.value;
            const p = record.product;
            const quality = assessQuality(raw, record);
            stats.mapped++;
            stats.tiers[quality.tier]++;
            for (const c of quality.passed) bump(stats.checksPassed, c);
            if (p.ingredients) stats.englishIngredients++;
            if (hasCompleteLabelNutrition(p.nutrition)) stats.completeNutrition++;
            if (p.nutrition?.values.proteinG != null) stats.proteinPresent++;
            if (p.allergens.status === 'listed') stats.allergensListed++;
            if (p.dietary.claims.length) stats.dietaryClaim++;
            if (p.dietary.inferred.by !== null) stats.dietaryInference++;
            if (p.description) stats.description++;
            bump(stats.quantityKinds, p.quantity?.kind ?? 'none');

            const candidate: Candidate = {
                code, barcode: p.barcode, tier: quality.tier, failed: quality.failed,
                scans: Number(raw.unique_scans_n ?? 0) || 0, modified: Number(raw.last_modified_t ?? 0) || 0,
            };
            const current = best.get(p.barcode);
            if (!current) best.set(p.barcode, candidate);
            else {
                duplicates++;
                const [keep, drop] = better(candidate, current) < 0 ? [candidate, current] : [current, candidate];
                best.set(p.barcode, keep);
                rejections.push({ sourceRecordId: drop.code, reasonCodes: ['duplicate_gtin'], detail: `same GTIN as ${keep.code}` });
            }
        }

        const ranked = [...best.values()].filter((c) => acceptTiers.has(c.tier)).sort(better);
        const chosen = new Set(ranked.slice(0, maxProducts).map((c) => c.code));
        for (const c of best.values()) {
            if (chosen.has(c.code)) continue;
            rejections.push({
                sourceRecordId: c.code,
                reasonCodes: acceptTiers.has(c.tier) ? ['over_cap'] : [`tier_${c.tier.toLowerCase()}`, ...c.failed.map((f) => `missing_${f}`)],
            });
        }
        const classifyMs = Date.now() - started;

        // ---- pass 2: persist ----
        const persistStarted = Date.now();
        let dbWriteMs = 0;
        const sourceTotals = { inserted: 0, updated: 0, unchanged: 0 };
        const productTotals = { inserted: 0, updated: 0, unchanged: 0, textChanged: 0 };
        let batch: { raw: Raw; record: ProductRecord; tier: Tier }[] = [];

        const flush = async () => {
            if (!batch.length) return;
            const items = batch;
            batch = [];
            const t = Date.now();
            await db.transaction(async (tx) => {
                const written = await upsertSourceRecords(tx, items.map((i): SourceRecordInput => ({
                    provenance: i.record.provenance, payload: i.raw, payloadVersion: OFF_PAYLOAD_VERSION, mapperVersion: OFF_MAPPER_VERSION,
                })), runId);
                sourceTotals.inserted += written.inserted;
                sourceTotals.updated += written.updated;
                sourceTotals.unchanged += written.unchanged;
                const products = await upsertProducts(tx, items.map((i): ProductInput => ({
                    record: i.record, tier: i.tier, recordId: written.ids.get(i.record.provenance.sourceRecordId)!,
                })));
                productTotals.inserted += products.inserted;
                productTotals.updated += products.updated;
                productTotals.unchanged += products.unchanged;
                productTotals.textChanged += products.textChanged;
            });
            dbWriteMs += Date.now() - t;
        };

        for await (const raw of open()) {
            const code = String(raw.code ?? '');
            if (!chosen.has(code)) continue;
            chosen.delete(code); // a code appearing twice in the input is only persisted once
            const mapped = mapOffProduct(raw, { importedAt: options.importedAt });
            if (!mapped.ok) continue; // cannot happen: pass 1 mapped the same record
            batch.push({ raw, record: mapped.value, tier: assessQuality(raw, mapped.value).tier });
            if (batch.length >= batchSize) await flush();
        }
        await flush();

        await recordRejections(db, runId, 'open_food_facts', rejections);
        const finished = Date.now();
        const rejectionsByCode: Record<string, number> = {};
        for (const r of rejections) bump(rejectionsByCode, r.reasonCodes[0]!);

        const summary: OffImportSummary = {
            runId, source: 'open_food_facts', kind,
            startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(), durationMs: finished - started,
            recordsScanned: scanned,
            candidates: stats.mapped,
            accepted: productTotals.inserted + productTotals.updated + productTotals.unchanged,
            rejected: rejections.length,
            rejectionsByCode, warningsByCode, duplicateGtins: duplicates, candidateStats: stats,
            sourceRecords: sourceTotals, products: productTotals,
            timingsMs: { classify: classifyMs, persist: finished - persistStarted, dbWrite: dbWriteMs },
            recordsPerSecond: Math.round((scanned * 1000) / Math.max(1, finished - started)),
        };
        await finishRun(db, runId, { stats: summary });
        return summary;
    } catch (error) {
        await finishRun(db, runId, { stats: {}, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}

/**
 * Rebuilds products from stored source_record payloads: no dump needed.
 * Use after a mapper change (bump OFF_MAPPER_VERSION) or to repair rows.
 */
export async function replayOffProducts(db: Db, options: { batchSize?: number } = {}) {
    const batchSize = options.batchSize ?? 500;
    const runId = await startRun(db, 'open_food_facts', 'off_replay', { batchSize, mapperVersion: OFF_MAPPER_VERSION });
    const totals = { records: 0, rejected: 0, inserted: 0, updated: 0, unchanged: 0, textChanged: 0 };
    let after = 0;
    for (;;) {
        const { rows } = await db.query<{ id: string; payload: Raw; imported_at: Date | string }>(
            `SELECT id, payload, imported_at FROM source_record WHERE source = 'open_food_facts' AND id > $1 ORDER BY id LIMIT $2`,
            [after, batchSize],
        );
        if (!rows.length) break;
        after = Number(rows.at(-1)!.id);
        const items: ProductInput[] = [];
        for (const row of rows) {
            totals.records++;
            const importedAt = new Date(row.imported_at).toISOString().replace(/\.\d{3}Z$/, 'Z');
            const mapped = mapOffProduct(row.payload, { importedAt });
            if (!mapped.ok) {
                totals.rejected++;
                continue;
            }
            items.push({ record: mapped.value, tier: assessQuality(row.payload, mapped.value).tier, recordId: Number(row.id) });
        }
        await db.transaction(async (tx) => {
            const written = await upsertProducts(tx, items);
            totals.inserted += written.inserted;
            totals.updated += written.updated;
            totals.unchanged += written.unchanged;
            totals.textChanged += written.textChanged;
            await tx.query(`UPDATE source_record SET mapper_version = $1 WHERE id = ANY($2::bigint[]) AND mapper_version <> $1`,
                [OFF_MAPPER_VERSION, rows.map((r) => r.id)]);
        });
    }
    await finishRun(db, runId, { stats: totals });
    return { runId, ...totals };
}
