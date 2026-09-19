/**
 * The assistant's entire access to the catalogue: two tools, both typed, both
 * validating their arguments, both returning only what the assistant needs.
 *
 *   searchProducts   ranked candidates (id + display fields, nothing else)
 *   lookupProducts   authoritative facts for ids the assistant selected
 *
 * Raw source payloads, provenance internals and database rows never reach a
 * prompt. Two reasons: they are mostly noise, and every extra field is another
 * thing a model can quietly restate as fact.
 */
import { z } from 'zod';
import { canDisplayPublicly } from '../contract/image.js';
import { dietaryMatch } from '../contract/dietary.js';
import { NUTRIENTS, type Nutrient } from '../contract/nutrition.js';
import type { Product } from '../contract/product.js';
import type { Db } from '../db/client.js';
import { readProductRecords } from '../db/catalogueRepository.js';
import type { Embedder } from '../embeddings/embedder.js';
import { searchProducts as runSearch, STRATEGIES } from '../retrieval/search.js';
import { AllergenSchema } from '../contract/allergens.js';
import type { RetrievalFilters } from '../retrieval/filters.js';

export const searchArgsSchema = z.object({
    query: z.string().min(1).max(120),
    strategy: z.enum(STRATEGIES),
    limit: z.number().int().min(1).max(20).default(10),
}).strict();
export type SearchArgs = z.infer<typeof searchArgsSchema>;

export const lookupArgsSchema = z.object({
    productIds: z.array(z.string().regex(/^\d{14}$/)).min(1).max(20),
}).strict();

/** A search result: enough to choose between products, not enough to describe one. */
export type ProductCandidate = {
    productId: string;
    name: string;
    brand: string | null;
    quantity: string | null;
    allergenEvidence: 'listed' | 'none_listed' | 'unknown';
};

/** Authoritative facts. Every value here came from the database; null means the source did not say. */
export type ProductFacts = {
    productId: string;
    name: string;
    brand: string | null;
    quantity: string | null;
    ingredients: string | null;
    nutrition: { per: '100g' | '100ml'; values: Record<Nutrient, number | null>; derived: Nutrient[] } | null;
    dietary: {
        claims: string[];
        vegan: 'yes' | 'no' | 'unknown';
        vegetarian: 'yes' | 'no' | 'unknown';
        /** Whether the answer above came from a claim on the pack or from an inference, and by whom. */
        basis: 'claim' | 'inferred' | 'none';
        inferredBy: string | null;
    };
    allergens: {
        status: 'listed' | 'none_listed' | 'unknown';
        contains: string[];
        mayContain: string[];
        unrecognised: string[];
    };
    image: { url: string; licence: string; attribution: string; sourcePageUrl: string | null } | null;
};

export type ToolDeps = { embedder?: Embedder };

export type ToolCallRecord = {
    tool: 'searchProducts' | 'lookupProducts';
    args: unknown;
    resultCount: number;
    latencyMs: number;
    error?: string;
};

/**
 * The tools, bound to a database. Each call is recorded: the run log needs to
 * show exactly which ids the assistant was given, because grounding is checked
 * against that set and nothing else.
 */
export class ProductTools {
    readonly calls: ToolCallRecord[] = [];
    /** Every id any tool has returned in this run. The only ids the answer may mention. */
    readonly seenIds = new Set<string>();

    constructor(private readonly db: Db, private readonly deps: ToolDeps = {}) {}

    async searchProducts(args: SearchArgs, filters: RetrievalFilters = {}): Promise<ProductCandidate[]> {
        const parsed = searchArgsSchema.parse(args);
        const started = performance.now();
        try {
            const hits = await runSearch(this.db, {
                query: parsed.query, strategy: parsed.strategy, limit: parsed.limit, filters,
            }, { embedder: this.deps.embedder });
            const candidates = hits.map((h) => ({
                productId: h.barcode, name: h.name, brand: h.brand, quantity: h.quantity,
                allergenEvidence: h.allergenEvidence,
            }));
            for (const c of candidates) this.seenIds.add(c.productId);
            this.calls.push({ tool: 'searchProducts', args: { ...parsed, filters }, resultCount: candidates.length, latencyMs: performance.now() - started });
            return candidates;
        } catch (error) {
            this.calls.push({ tool: 'searchProducts', args: { ...parsed, filters }, resultCount: 0, latencyMs: performance.now() - started, error: String(error) });
            throw error;
        }
    }

    async lookupProducts(productIds: string[]): Promise<ProductFacts[]> {
        const { productIds: ids } = lookupArgsSchema.parse({ productIds });
        const started = performance.now();
        // A lookup of an id no tool returned would mean the caller invented it.
        const unknown = ids.filter((id) => !this.seenIds.has(id));
        if (unknown.length) throw new Error(`lookupProducts called with ids no search returned: ${unknown.join(', ')}`);

        const records = await readProductRecords(this.db, ids);
        const facts: ProductFacts[] = [];
        for (const id of ids) {
            const result = records.get(id);
            if (!result?.ok) continue;
            facts.push(toFacts(result.value.product));
        }
        this.calls.push({ tool: 'lookupProducts', args: { productIds: ids }, resultCount: facts.length, latencyMs: performance.now() - started });
        return facts;
    }
}

function toFacts(product: Product): ProductFacts {
    const vegan = dietaryMatch(product.dietary, 'vegan', 'claims_or_inferred');
    const vegetarian = dietaryMatch(product.dietary, 'vegetarian', 'claims_or_inferred');
    const claimed = product.dietary.claims.includes('vegan') || product.dietary.claims.includes('vegetarian');
    const basis: ProductFacts['dietary']['basis'] = claimed ? 'claim'
        : (vegan === 'unknown' && vegetarian === 'unknown' ? 'none' : 'inferred');
    const displayable = product.images.find((i) => canDisplayPublicly(i));
    return {
        productId: product.barcode,
        name: product.name,
        brand: product.brand,
        quantity: product.quantity?.raw ?? null,
        ingredients: product.ingredients,
        nutrition: product.nutrition
            ? { per: product.nutrition.per, values: { ...product.nutrition.values }, derived: [...product.nutrition.derived] }
            : null,
        dietary: {
            claims: [...product.dietary.claims],
            vegan, vegetarian, basis,
            inferredBy: product.dietary.inferred.by,
        },
        allergens: {
            status: product.allergens.status,
            contains: [...product.allergens.contains],
            mayContain: [...product.allergens.mayContain],
            unrecognised: [...product.allergens.unrecognised],
        },
        image: displayable
            ? { url: displayable.url, licence: displayable.licence!, attribution: displayable.attribution!, sourcePageUrl: displayable.sourcePageUrl }
            : null,
    };
}

/** The nutrients an assistant is allowed to quote, in label order. */
export const QUOTABLE_NUTRIENTS = NUTRIENTS;
