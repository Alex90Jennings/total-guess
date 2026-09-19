import { z } from 'zod';

/**
 * Canonical categories are ids in the Open Food Facts category taxonomy
 * ("en:oat-milks"): a shared vocabulary that retrieval can filter on.
 * Retailer breadcrumbs ("Food Cupboard > Tins") are not canonical and live on
 * ProductListing.retailerCategoryPath instead.
 */
export const CategoryIdSchema = z.string().regex(/^[a-z]{2}:[\p{L}\p{N}-]+$/u, 'expected a taxonomy id like "en:oat-milks"');
export type CategoryId = z.infer<typeof CategoryIdSchema>;

export const ProductCategoriesSchema = z.strictObject({
    /** Taxonomy ids, general to specific as the source orders them. May be empty. */
    canonical: z.array(CategoryIdSchema),
});
export type ProductCategories = z.infer<typeof ProductCategoriesSchema>;

/** "en:oat-milks" -> "oat milks" */
export function categoryLabel(id: CategoryId): string {
    return id.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
}
