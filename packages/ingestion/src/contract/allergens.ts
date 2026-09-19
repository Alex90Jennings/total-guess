/**
 * Allergens, split the way labels split them:
 *   contains     declared ingredients ("Contains: milk")
 *   mayContain   precautionary warnings ("May contain nuts")
 *
 * `status` says how far to trust an empty list. `none_listed` means the source
 * lists ingredients but no allergens: that is NOT a statement that the product
 * is allergen-free, and nothing may present it as one.
 */
import { z } from 'zod';

/** The 14 allergens UK food law requires labels to emphasise. */
export const UK_ALLERGENS = [
    'celery', 'gluten', 'crustaceans', 'eggs', 'fish', 'lupin', 'milk',
    'molluscs', 'mustard', 'tree_nuts', 'peanuts', 'sesame', 'soya', 'sulphites',
] as const;
export const AllergenSchema = z.enum(UK_ALLERGENS);
export type Allergen = z.infer<typeof AllergenSchema>;

export const AllergenDataSchema = z
    .strictObject({
        status: z.enum(['listed', 'none_listed', 'unknown']),
        contains: z.array(AllergenSchema),
        mayContain: z.array(AllergenSchema),
        /** Source terms that are not one of the 14 (kept, never dropped silently). */
        unrecognised: z.array(z.string().min(1)),
    })
    .refine((a) => (a.status === 'listed') === (a.contains.length + a.mayContain.length + a.unrecognised.length > 0), {
        message: 'status "listed" if and only if something is listed',
        path: ['status'],
    });
export type AllergenData = z.infer<typeof AllergenDataSchema>;

/** Names and Open Food Facts tags -> the 14. */
const ALLERGEN_NAMES: Record<string, Allergen> = {
    celery: 'celery',
    gluten: 'gluten', wheat: 'gluten', barley: 'gluten', rye: 'gluten', oats: 'gluten', 'cereals containing gluten': 'gluten',
    crustaceans: 'crustaceans',
    egg: 'eggs', eggs: 'eggs',
    fish: 'fish',
    lupin: 'lupin',
    milk: 'milk',
    molluscs: 'molluscs',
    mustard: 'mustard',
    nuts: 'tree_nuts', 'tree nuts': 'tree_nuts',
    peanut: 'peanuts', peanuts: 'peanuts',
    sesame: 'sesame', 'sesame seeds': 'sesame',
    soy: 'soya', soya: 'soya', soybeans: 'soya',
    sulphites: 'sulphites', 'sulphur dioxide': 'sulphites', 'sulphur dioxide and sulphites': 'sulphites',
};

/** "en:sesame-seeds" / "Sesame" -> "sesame"; null when it is not one of the 14. */
export function toAllergen(term: string): Allergen | null {
    const name = term.trim().toLowerCase().replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
    return ALLERGEN_NAMES[name] ?? null;
}

/**
 * Builds AllergenData from source terms. `hasIngredientInformation` decides
 * between "none_listed" and "unknown" when nothing is listed.
 */
export function buildAllergenData(contains: string[], mayContain: string[], hasIngredientInformation: boolean): AllergenData {
    const unrecognised: string[] = [];
    const sort = (terms: string[]) => {
        const out = new Set<Allergen>();
        for (const term of terms) {
            const allergen = toAllergen(term);
            if (allergen) out.add(allergen);
            else if (term.trim()) unrecognised.push(term.trim());
        }
        return [...out].sort();
    };
    const data = { contains: sort(contains), mayContain: sort(mayContain), unrecognised: [...new Set(unrecognised)] };
    const anything = data.contains.length + data.mayContain.length + data.unrecognised.length > 0;
    return { status: anything ? 'listed' : hasIngredientInformation ? 'none_listed' : 'unknown', ...data };
}
