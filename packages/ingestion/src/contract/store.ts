import { z } from 'zod';
import { RetailerIdSchema } from './retailer.js';

/**
 * A physical or online shop, as a price source describes it. Coordinates are
 * deliberately left out: nothing we build needs them, and the OSM identity is
 * enough to look them up.
 */
export const StoreSchema = z.strictObject({
    /** Null for shops outside the retailer registry (independents, small chains). */
    retailer: RetailerIdSchema.nullable(),
    /** The shop's brand/name exactly as the source gave it. */
    name: z.string().min(1).nullable(),
    /** The price source's own id for the store. */
    sourceStoreId: z.string().min(1).nullable(),
    osm: z.strictObject({ type: z.enum(['node', 'way', 'relation']), id: z.int().positive() }).nullable(),
    postcode: z.string().min(1).nullable(),
    city: z.string().min(1).nullable(),
    /** ISO 3166-1 alpha-2, e.g. "GB". */
    countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
});
export type Store = z.infer<typeof StoreSchema>;
