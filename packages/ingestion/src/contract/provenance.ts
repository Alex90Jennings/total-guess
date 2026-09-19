/**
 * Where a value came from.
 *
 * Record-level: every record a mapper produces (ProductRecord,
 * ProductListing, PriceObservation, ReferencePrice) comes from exactly one
 * source record and carries its Provenance, so every value in it can be
 * traced. Images carry their own (they have their own licence and author).
 * Field-level provenance is only needed once records from several sources
 * are merged into one product; see README.
 */
import { z } from 'zod';
import { DATA_SOURCES, DataSourceIdSchema, type DataSourceId } from './dataSource.js';

export const IsoUtcSchema = z.iso.datetime(); // "...Z" only
export const IsoDateSchema = z.iso.date();

export const ProvenanceSchema = z.strictObject({
    source: DataSourceIdSchema,
    /** The record's id inside the source: OFF barcode, Open Prices price id, retailer SKU, curated code. */
    sourceRecordId: z.string().min(1),
    sourceUrl: z.url().nullable(),
    /** When we fetched or imported it. */
    importedAt: IsoUtcSchema,
    /** When the source says the record last changed, if it says. */
    sourceUpdatedAt: IsoUtcSchema.nullable(),
    /** Licence and attribution as they stood at import (a snapshot, not a live lookup). */
    licence: z.string().min(1).nullable(),
    attribution: z.string().min(1).nullable(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Provenance with the licence and attribution taken from the source registry. */
export function provenanceFor(
    source: DataSourceId,
    record: { sourceRecordId: string; sourceUrl: string | null; importedAt: string; sourceUpdatedAt: string | null },
): Provenance {
    const { licence, attribution } = DATA_SOURCES[source];
    return { source, ...record, licence, attribution };
}
