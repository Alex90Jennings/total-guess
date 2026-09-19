/**
 * Retrieval evaluation set: queries with relevance rules.
 *
 * Labels are defined by rules over product metadata (canonical OFF
 * categories, brand, name), written before any embeddings existed and
 * materialised once into qrels (evaluation/qrels.json). They never look at
 * any retrieval strategy's output.
 *
 *   grade 2  what the query asks for
 *   grade 1  related, acceptable (partial credit in nDCG only)
 *
 * Deterministic requirements (vegan, max salt...) are not part of the text
 * to be "understood": they are structured filters, enforced in SQL for every
 * strategy, and a product that fails them is never relevant.
 */
import { createHash } from 'node:crypto';
import type { RetrievalFilters } from '../retrieval/filters.js';

export const QUERY_CATEGORIES = [
    'known_failure', 'exact_product', 'brand', 'synonym_uk', 'semantic_intent',
    'similarity', 'dietary', 'nutrition', 'category_ambiguity',
] as const;
export type QueryCategory = (typeof QUERY_CATEGORIES)[number];

/** Every given condition must hold. `brand` matches the brand or the name. Patterns are case-insensitive regexes. */
export type LabelRule = {
    categories?: string[];
    brand?: string;
    name?: string;
    notName?: string;
};

export type EvalQuery = {
    id: string;
    category: QueryCategory;
    text: string;
    filters?: RetrievalFilters;
    relevant: LabelRule[];
    partial?: LabelRule[];
    note?: string;
};

export type LabelProduct = { barcode: string; name: string; brand: string | null; categories: string[] };

function matches(rule: LabelRule, p: LabelProduct): boolean {
    if (rule.categories && !rule.categories.some((c) => p.categories.includes(c))) return false;
    if (rule.brand) {
        const re = new RegExp(rule.brand, 'i');
        if (!re.test(p.brand ?? '') && !re.test(p.name)) return false;
    }
    if (rule.name && !new RegExp(rule.name, 'i').test(p.name)) return false;
    if (rule.notName && new RegExp(rule.notName, 'i').test(p.name)) return false;
    return true;
}

/** 2, 1 or 0 for a product, by the query's rules. */
export function grade(query: EvalQuery, product: LabelProduct): 0 | 1 | 2 {
    if (query.relevant.some((r) => matches(r, product))) return 2;
    if (query.partial?.some((r) => matches(r, product))) return 1;
    return 0;
}

/** barcode -> grade, for the products that are relevant at all. */
export type Qrels = Record<string, Record<string, 1 | 2>>;

/**
 * Identifies the exact query set a set of labels was built for. Stored in
 * qrels.json so a mismatch between labels and queries is detectable rather
 * than silent.
 */
export function queriesFingerprint(queries: EvalQuery[]): string {
    return createHash('sha256').update(JSON.stringify(queries)).digest('hex').slice(0, 16);
}
