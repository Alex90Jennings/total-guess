/**
 * Lexical search sanity check: 20 plain queries, top 5 results each.
 * Not a retrieval evaluation, just evidence that the corpus and FTS are usable.
 * Writes .captures/reports/search-sanity.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { searchProducts } from '../src/db/searchRepository.js';

const here = dirname(fileURLToPath(import.meta.url));

export const SANITY_QUERIES = [
    'baked beans', 'greek yoghurt', 'wholemeal bread', 'tomato pasta sauce', 'vegetarian sausages',
    'dark chocolate', 'peanut butter', 'chicken breast', 'lentils', 'cheddar cheese',
    'porridge oats', 'orange juice', 'semi skimmed milk', 'basmati rice', 'tinned tuna',
    'hummus', 'salted butter', 'cornflakes', 'free range eggs', 'oat milk',
];

async function main() {
    const db = await openDatabase();
    try {
        const results = [];
        for (const query of SANITY_QUERIES) {
            const started = performance.now();
            const hits = await searchProducts(db, query, { limit: 5 });
            const ms = Math.round((performance.now() - started) * 10) / 10;
            const total = Number((await db.query<{ n: number }>(
                `SELECT count(*) AS n FROM product, websearch_to_tsquery('english', $1) q WHERE search @@ q`, [query])).rows[0]?.n ?? 0);
            results.push({ query, matches: total, ms, top: hits.map((h) => ({ name: h.name, brand: h.brand, quantity: h.quantity, tier: h.tier, rank: Math.round(h.rank * 1000) / 1000 })) });
            console.log(`\n${query}  (${total} matches, ${ms} ms)`);
            for (const h of hits) console.log(`  ${h.tier}  ${h.name}${h.brand ? ` — ${h.brand}` : ''}${h.quantity ? ` [${h.quantity}]` : ''}  ${h.rank.toFixed(3)}`);
        }
        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'search-sanity.json'), JSON.stringify(results, null, 2));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
