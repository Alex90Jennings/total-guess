/**
 * Open Prices observations and the legacy curated catalogue -> PostgreSQL.
 *
 * Open Prices rows are historical evidence (price_observation). Curated rows
 * are listings with representative prices (product_listing + reference_price).
 * The two are never merged, and neither is linked to an OFF product unless a
 * barcode establishes the identity.
 */
import { OpenPriceSchema, mapOpenPrice } from '../sources/openPrices/mapPrice.js';
import { CuratedItemSchema, mapCuratedItem } from '../sources/curated/mapItem.js';
import type { Db } from '../db/client.js';
import { upsertSourceRecords, type SourceRecordInput } from '../db/catalogueRepository.js';
import { finishRun, recordRejections, startRun, type Rejection } from '../db/ingestionRuns.js';
import { upsertListings, upsertPriceObservations, upsertReferencePrices, upsertStores } from '../db/priceRepository.js';
import type { PriceObservation, ProductListing, ReferencePrice } from '../contract/index.js';

export const OPEN_PRICES_PAYLOAD_VERSION = 1;
export const OPEN_PRICES_MAPPER_VERSION = 1;
export const CURATED_PAYLOAD_VERSION = 1;
export const CURATED_MAPPER_VERSION = 1;

/** Machine-readable reason for a mapper error message. */
export function reasonCode(error: string): string {
    if (error.startsWith('currency')) return 'not_gbp';
    if (error.startsWith('category price')) return 'no_product_identity';
    if (error.startsWith('restricted-circulation')) return 'restricted_gtin';
    if (error.startsWith('not a valid GTIN')) return 'invalid_gtin';
    if (error.startsWith('price is not')) return 'invalid_price';
    if (error.startsWith('unknown store')) return 'unknown_retailer';
    return 'mapper_rejected';
}

const bump = (map: Record<string, number>, key: string) => { map[key] = (map[key] ?? 0) + 1; };

export async function importOpenPrices(db: Db, items: { raw: unknown; importedAt: string }[], batchSize = 500) {
    const started = Date.now();
    const runId = await startRun(db, 'open_prices', 'open_prices_import', { count: items.length });
    const totals = { scanned: 0, accepted: 0, inserted: 0, updated: 0, unchanged: 0, rejected: 0, rejectionsByCode: {} as Record<string, number> };
    const rejections: Rejection[] = [];
    try {
        for (let i = 0; i < items.length; i += batchSize) {
            const valid: { observation: PriceObservation; payload: Record<string, unknown> }[] = [];
            for (const { raw, importedAt } of items.slice(i, i + batchSize)) {
                totals.scanned++;
                const result = mapOpenPrice(raw, { importedAt });
                const id = String((raw as { id?: unknown })?.id ?? `(item ${totals.scanned})`);
                if (!result.ok) {
                    const code = reasonCode(result.errors[0] ?? '');
                    rejections.push({ sourceRecordId: id, reasonCodes: [code], detail: result.errors.join('; ') });
                    bump(totals.rejectionsByCode, code);
                    continue;
                }
                // The stored payload is the parsed subset: no contributor username, no coordinates.
                valid.push({ observation: result.value, payload: OpenPriceSchema.parse(raw) as Record<string, unknown> });
            }
            await db.transaction(async (tx) => {
                const written = await upsertSourceRecords(tx, valid.map((v): SourceRecordInput => ({
                    provenance: v.observation.provenance, payload: v.payload,
                    payloadVersion: OPEN_PRICES_PAYLOAD_VERSION, mapperVersion: OPEN_PRICES_MAPPER_VERSION,
                })), runId);
                totals.inserted += written.inserted;
                totals.updated += written.updated;
                totals.unchanged += written.unchanged;
                const changed = valid.filter((v) => written.changedIds.has(v.observation.provenance.sourceRecordId));
                const storeIds = await upsertStores(tx, 'open_prices', changed.flatMap((v) => (v.observation.store ? [v.observation.store] : [])));
                await upsertPriceObservations(tx, changed.map((v) => ({
                    observation: v.observation,
                    recordId: written.ids.get(v.observation.provenance.sourceRecordId)!,
                    storeId: v.observation.store?.sourceStoreId ? storeIds.get(v.observation.store.sourceStoreId) ?? null : null,
                })));
            });
            totals.accepted += valid.length;
        }
        totals.rejected = rejections.length;
        await recordRejections(db, runId, 'open_prices', rejections);
        const summary = { runId, ...totals, durationMs: Date.now() - started };
        await finishRun(db, runId, { stats: summary });
        return summary;
    } catch (error) {
        await finishRun(db, runId, { stats: totals, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}

export async function importCurated(db: Db, rows: unknown[], importedAt: string) {
    const started = Date.now();
    const runId = await startRun(db, 'curated', 'curated_import', { count: rows.length });
    const totals = { scanned: 0, accepted: 0, inserted: 0, updated: 0, unchanged: 0, rejected: 0, rejectionsByCode: {} as Record<string, number> };
    const rejections: Rejection[] = [];
    try {
        const valid: { listing: ProductListing; referencePrice: ReferencePrice; payload: Record<string, unknown> }[] = [];
        for (const row of rows) {
            totals.scanned++;
            const result = mapCuratedItem(row, { importedAt });
            if (!result.ok) {
                const code = reasonCode(result.errors[0] ?? '');
                rejections.push({ sourceRecordId: String((row as { _id?: unknown })?._id ?? totals.scanned), reasonCodes: [code], detail: result.errors.join('; ') });
                bump(totals.rejectionsByCode, code);
                continue;
            }
            valid.push({ ...result.value, payload: CuratedItemSchema.parse(row) });
        }
        await db.transaction(async (tx) => {
            const written = await upsertSourceRecords(tx, valid.map((v): SourceRecordInput => ({
                provenance: v.listing.provenance, payload: v.payload, payloadVersion: CURATED_PAYLOAD_VERSION, mapperVersion: CURATED_MAPPER_VERSION,
            })), runId);
            totals.inserted += written.inserted;
            totals.updated += written.updated;
            totals.unchanged += written.unchanged;
            const changed = valid.filter((v) => written.changedIds.has(v.listing.provenance.sourceRecordId));
            const recordId = (v: (typeof valid)[number]) => written.ids.get(v.listing.provenance.sourceRecordId)!;
            await upsertListings(tx, changed.map((v) => ({ listing: v.listing, recordId: recordId(v) })));
            await upsertReferencePrices(tx, changed.map((v) => ({ price: v.referencePrice, recordId: recordId(v) })));
        });
        totals.accepted = valid.length;
        totals.rejected = rejections.length;
        await recordRejections(db, runId, 'curated', rejections);
        const summary = { runId, ...totals, durationMs: Date.now() - started };
        await finishRun(db, runId, { stats: summary });
        return summary;
    } catch (error) {
        await finishRun(db, runId, { stats: totals, error: error instanceof Error ? error.message : String(error) });
        throw error;
    }
}
