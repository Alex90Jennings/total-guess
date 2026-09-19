import { z } from 'zod';
import { DataSourceIdSchema } from './dataSource.js';

/**
 * A remote product image with its own provenance. Images are never copied
 * into our storage; the frontend renders the URL and must show `attribution`
 * and `licence` with it. An image with no licence must not be displayed
 * publicly (see canDisplayPublicly).
 */
export const ProductImageSchema = z.strictObject({
    url: z.url({ protocol: /^https$/ }),
    role: z.enum(['front', 'ingredients', 'nutrition', 'packaging', 'other']),
    source: DataSourceIdSchema,
    licence: z.string().min(1).nullable(),
    attribution: z.string().min(1).nullable(),
    /** The photographer or uploader, when the source names one. */
    contributor: z.string().min(1).nullable(),
    /** Page describing the image or product at the source, for the attribution link. */
    sourcePageUrl: z.url().nullable(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

export function canDisplayPublicly(image: ProductImage): boolean {
    return image.licence !== null && image.attribution !== null;
}
