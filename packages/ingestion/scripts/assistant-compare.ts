/**
 * Retrieval-only versus decomposed retrieval — without a model.
 *
 *   yarn workspace @total-guess/ingestion assistant:compare
 *
 * A: the user's sentence retrieved directly with hybrid_normalised, the best
 *    strategy from the retrieval phase.
 * B: the hand-written ("oracle") decomposition of the same request, with the
 *    case's structured filters applied in SQL.
 *
 * B is what a perfect planner would produce, so this measures the ceiling of
 * query planning on this corpus and needs no API key. It answers "is this
 * failure mode fixable by decomposition at all?", which is a different and
 * prior question to "can the model produce the decomposition?".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';
import { grade, type LabelProduct } from '../src/evaluation/dataset.js';
import { routeStrategy } from '../src/assistant/routing.js';
import { searchProducts } from '../src/retrieval/search.js';
import { ASSISTANT_CASES } from '../evaluation/assistant/cases.js';

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
    const db = await openDatabase();
    const embedder = new LocalEmbedder();
    try {
        await embedder.warmUp();
        const cases = ASSISTANT_CASES.filter((c) => c.relevant && c.oracleSearches?.length);
        const rows: {
            id: string; category: string; query: string;
            baselineP5: number; oracleP5: number; oracleFilteredP5: number;
            baselineTop: string[]; oracleTop: string[];
        }[] = [];

        for (const testCase of cases) {
            const baseline = await searchProducts(db, { query: testCase.query, strategy: 'hybrid_normalised', limit: 10 }, { embedder });

            // Round-robin the oracle searches, as the assistant interleaves its own.
            const lists = await Promise.all((testCase.oracleSearches ?? []).map(async (query) => {
                const strategy = routeStrategy(testCase.intent, query).strategy;
                return searchProducts(db, { query, strategy, limit: 10 }, { embedder });
            }));
            const filteredLists = await Promise.all((testCase.oracleSearches ?? []).map(async (query) => {
                const strategy = routeStrategy(testCase.intent, query).strategy;
                return searchProducts(db, { query, strategy, limit: 10, filters: testCase.filters ?? {} }, { embedder });
            }));
            const interleave = (ls: { barcode: string }[][]) => {
                const out: string[] = [];
                for (let i = 0; out.length < 10; i++) {
                    let advanced = false;
                    for (const list of ls) {
                        const hit = list[i];
                        if (!hit) continue;
                        advanced = true;
                        if (!out.includes(hit.barcode)) out.push(hit.barcode);
                    }
                    if (!advanced) break;
                }
                return out;
            };
            const baselineIds = baseline.map((h) => h.barcode);
            const oracleIds = interleave(lists);
            const oracleFilteredIds = interleave(filteredLists);

            const all = [...new Set([...baselineIds, ...oracleIds, ...oracleFilteredIds])];
            const { rows: productRows } = await db.query<{ barcode: string; name: string; brand: string | null; categories: string[] }>(
                `SELECT p.barcode, p.name, p.brand, coalesce(array_agg(c.category_id) FILTER (WHERE c.category_id IS NOT NULL), '{}') AS categories
                 FROM product p LEFT JOIN product_category c USING (barcode)
                 WHERE p.barcode = ANY($1::text[]) GROUP BY p.barcode, p.name, p.brand`, [all]);
            const products = new Map<string, LabelProduct>(productRows.map((r) => [r.barcode, r]));
            const query = { id: testCase.id, category: testCase.category, text: testCase.query, relevant: testCase.relevant! };
            const p5 = (ids: string[]) => {
                const top = ids.slice(0, 5);
                if (!top.length) return 0;
                return top.filter((id) => {
                    const product = products.get(id);
                    return product ? grade(query as never, product) === 2 : false;
                }).length / 5;
            };

            rows.push({
                id: testCase.id, category: testCase.category, query: testCase.query,
                baselineP5: p5(baselineIds), oracleP5: p5(oracleIds), oracleFilteredP5: p5(oracleFilteredIds),
                baselineTop: baselineIds.slice(0, 3).map((id) => products.get(id)?.name ?? id),
                oracleTop: oracleFilteredIds.slice(0, 3).map((id) => products.get(id)?.name ?? id),
            });
        }

        const mean = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0) / (rows.length || 1);
        const report = {
            generatedAt: new Date().toISOString(),
            cases: rows.length,
            note: 'Oracle decomposition, written by hand: the ceiling of query planning, not a model result.',
            baselinePrecision5: mean((r) => r.baselineP5),
            oraclePrecision5: mean((r) => r.oracleP5),
            oracleFilteredPrecision5: mean((r) => r.oracleFilteredP5),
            perCase: rows,
        };
        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'decomposition-ceiling.json'), JSON.stringify(report, null, 2));

        console.log(`\n${'case'.padEnd(24)}${'baseline'.padStart(10)}${'oracle'.padStart(10)}${'oracle+filters'.padStart(16)}`);
        for (const row of rows) {
            console.log(row.id.padEnd(24) + row.baselineP5.toFixed(2).padStart(10) + row.oracleP5.toFixed(2).padStart(10) + row.oracleFilteredP5.toFixed(2).padStart(16));
        }
        console.log(`${'MEAN P@5'.padEnd(24)}${report.baselinePrecision5.toFixed(3).padStart(10)}${report.oraclePrecision5.toFixed(3).padStart(10)}${report.oracleFilteredPrecision5.toFixed(3).padStart(16)}`);
    } finally {
        await db.close();
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
