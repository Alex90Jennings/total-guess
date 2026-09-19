/**
 * Product retrieval. One entry point, four ranking strategies:
 *
 *   fts               PostgreSQL full-text search (the baseline)
 *   fts_normalised    the same, with deterministic UK/US term expansion
 *   vector            exact pgvector cosine search over product embeddings
 *   hybrid            RRF over fts + vector       (hybrid_normalised: fts_normalised + vector)
 *
 * Structured filters (nutrition, dietary, allergens, categories, tier) are
 * applied in SQL inside every strategy, so ranking never decides them and a
 * product that fails a filter cannot appear whatever the query says.
 */
import type { Db } from '../db/client.js';
import type { Embedder } from '../embeddings/embedder.js';
import { vectorLiteral } from '../embeddings/embedProducts.js';
import { filterConditions, type RetrievalFilters } from './filters.js';
import { reciprocalRankFusion } from './rrf.js';
import { normalisedTsQuerySql } from './terminology.js';

export const STRATEGIES = ['fts', 'fts_normalised', 'vector', 'hybrid', 'hybrid_normalised'] as const;
export type SearchStrategy = (typeof STRATEGIES)[number];

export type SearchRequest = {
    query: string;
    filters?: RetrievalFilters;
    strategy?: SearchStrategy;
    limit?: number;
    /** How many candidates each strategy contributes to fusion, and the RRF constant. */
    fusion?: { depth?: number; k?: number; lexicalWeight?: number; vectorWeight?: number };
};

export type SearchHit = {
    barcode: string;
    name: string;
    brand: string | null;
    quantity: string | null;
    tier: 'A' | 'B' | 'C';
    score: number;
    lexicalRank: number | null;
    vectorRank: number | null;
    /**
     * How well allergens are known for this product: "listed" (the source
     * listed some), "none_listed" (ingredients known, none listed: not a
     * guarantee), "unknown". Callers filtering allergens must show this.
     */
    allergenEvidence: 'listed' | 'none_listed' | 'unknown';
};

export type SearchDeps = { embedder?: Embedder };

const PROJECTION = `p.barcode, p.name, p.brand, p.quantity_raw, p.quality_tier, p.allergen_status`;
type ProductRow = { barcode: string; name: string; brand: string | null; quantity_raw: string | null; quality_tier: 'A' | 'B' | 'C'; allergen_status: SearchHit['allergenEvidence'] };

const limitOf = (n: number | undefined, fallback: number) => Math.min(Math.max(Math.trunc(n ?? fallback), 1), 200);

async function lexicalCandidates(db: Db, request: SearchRequest, limit: number, normalised: boolean) {
    const params: unknown[] = [];
    let queryExpression: string;
    if (normalised) {
        const sql = normalisedTsQuerySql(request.query, params);
        if (!sql) return [];
        queryExpression = sql;
    } else {
        params.push(request.query);
        queryExpression = `websearch_to_tsquery('english', $${params.length})`;
    }
    const where = ['p.search @@ tq.q', ...filterConditions(request.filters, params)];
    params.push(limit);
    const { rows } = await db.query<ProductRow & { rank: number }>(
        // The query expression is a value, not a table function, so it is wrapped in a subselect.
        `SELECT ${PROJECTION}, ts_rank_cd(p.search, tq.q) AS rank
         FROM product p, (SELECT ${queryExpression} AS q) AS tq
         WHERE ${where.join(' AND ')}
         ORDER BY rank DESC, p.barcode
         LIMIT $${params.length}`,
        params,
    );
    return rows;
}

async function vectorCandidates(db: Db, request: SearchRequest, limit: number, embedder: Embedder) {
    const vector = vectorLiteral(await embedder.embedQuery(request.query));
    const params: unknown[] = [vector, embedder.id];
    // Only embeddings that match the product's current semantic document are used.
    const where = ['e.model = $2', 'e.text_hash = p.text_hash', 'e.document_version = p.document_version',
        ...filterConditions(request.filters, params)];
    params.push(limit);
    const { rows } = await db.query<ProductRow & { distance: number }>(
        `SELECT ${PROJECTION}, e.embedding <=> $1::vector AS distance
         FROM product_embedding e JOIN product p ON p.barcode = e.barcode
         WHERE ${where.join(' AND ')}
         ORDER BY e.embedding <=> $1::vector, p.barcode
         LIMIT $${params.length}`,
        params,
    );
    return rows;
}

const toHit = (row: ProductRow, score: number, lexicalRank: number | null, vectorRank: number | null): SearchHit => ({
    barcode: row.barcode, name: row.name, brand: row.brand, quantity: row.quantity_raw, tier: row.quality_tier,
    score, lexicalRank, vectorRank, allergenEvidence: row.allergen_status,
});

export async function searchProducts(db: Db, request: SearchRequest, deps: SearchDeps = {}): Promise<SearchHit[]> {
    const strategy = request.strategy ?? 'fts';
    const limit = limitOf(request.limit, 10);
    const needsVector = strategy === 'vector' || strategy.startsWith('hybrid');
    if (needsVector && !deps.embedder) throw new Error(`strategy "${strategy}" needs an embedder`);

    if (strategy === 'fts' || strategy === 'fts_normalised') {
        const rows = await lexicalCandidates(db, request, limit, strategy === 'fts_normalised');
        return rows.map((row, i) => toHit(row, Number(row.rank), i + 1, null));
    }
    if (strategy === 'vector') {
        const rows = await vectorCandidates(db, request, limit, deps.embedder!);
        return rows.map((row, i) => toHit(row, 1 - Number(row.distance), null, i + 1));
    }

    const depth = limitOf(request.fusion?.depth, 50);
    const [lexical, vector] = await Promise.all([
        lexicalCandidates(db, request, depth, strategy === 'hybrid_normalised'),
        vectorCandidates(db, request, depth, deps.embedder!),
    ]);
    const rows = new Map<string, ProductRow>();
    for (const row of [...lexical, ...vector]) rows.set(row.barcode, row);
    const fused = reciprocalRankFusion(
        [
            { items: lexical.map((r) => r.barcode), weight: request.fusion?.lexicalWeight ?? 1 },
            { items: vector.map((r) => r.barcode), weight: request.fusion?.vectorWeight ?? 1 },
        ],
        { k: request.fusion?.k },
    );
    return fused.slice(0, limit).map((f) => toHit(rows.get(f.id)!, f.score, f.ranks[0] ?? null, f.ranks[1] ?? null));
}
