/**
 * Runs the frozen evaluation set against every retrieval strategy and writes
 * .captures/reports/retrieval-evaluation.json.
 *
 *   yarn workspace @total-guess/ingestion eval:run [--limit 10] [--depth 50] [--k 60]
 *
 * Latency is measured end to end, including embedding the query for vector
 * and hybrid (the model is warmed up first, so no run pays the load cost).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/client.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';
import { aggregate, evaluateRanking, type Labels, type QueryMetrics } from '../src/evaluation/metrics.js';
import { searchProducts, STRATEGIES, type SearchStrategy } from '../src/retrieval/search.js';
import { normalisationApplies, TERMINOLOGY_ENTRIES } from '../src/retrieval/terminology.js';
import { EVAL_QUERIES } from '../evaluation/queries.js';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : undefined;
};

type PerQuery = { id: string; category: string; text: string; strategy: SearchStrategy; metrics: QueryMetrics; latencyMs: number; top: { barcode: string; name: string; brand: string | null; grade: number }[] };

async function main() {
    const limit = arg('limit') ?? 10;
    const fusion = { depth: arg('depth') ?? 50, k: arg('k') ?? 60 };
    const qrelsFile = JSON.parse(readFileSync(join(here, '..', 'evaluation', 'qrels.json'), 'utf8')) as
        { generatedAt: string; corpusProducts: number; queriesFingerprint: string; qrels: Record<string, Labels> };

    const db = await openDatabase();
    const embedder = new LocalEmbedder();
    try {
        await embedder.warmUp();
        const embedded = Number((await db.query<{ n: number }>(
            'SELECT count(*) AS n FROM product_embedding WHERE model = $1', [embedder.id])).rows[0]!.n);

        const results: PerQuery[] = [];
        for (const strategy of STRATEGIES) {
            for (const query of EVAL_QUERIES) {
                const labels = qrelsFile.qrels[query.id] ?? {};
                const started = performance.now();
                const hits = await searchProducts(db, { query: query.text, filters: query.filters, strategy, limit, fusion }, { embedder });
                const latencyMs = performance.now() - started;
                results.push({
                    id: query.id, category: query.category, text: query.text, strategy,
                    metrics: evaluateRanking(hits.map((h) => h.barcode), labels),
                    latencyMs: Math.round(latencyMs * 10) / 10,
                    top: hits.slice(0, 5).map((h) => ({ barcode: h.barcode, name: h.name, brand: h.brand, grade: labels[h.barcode] ?? 0 })),
                });
            }
        }

        const byStrategy = Object.fromEntries(STRATEGIES.map((s) => [s, aggregate(results.filter((r) => r.strategy === s))]));
        const categories = [...new Set(EVAL_QUERIES.map((q) => q.category))];
        const byCategory = Object.fromEntries(categories.map((c) => [c, Object.fromEntries(
            STRATEGIES.map((s) => [s, aggregate(results.filter((r) => r.strategy === s && r.category === c))]),
        )]));
        // Queries the terminology list does not touch, to separate its effect from the model's.
        const untouched = EVAL_QUERIES.filter((q) => !normalisationApplies(q.text)).map((q) => q.id);
        const byNormalisationReach = {
            normalisedQueries: EVAL_QUERIES.length - untouched.length,
            untouchedOnly: Object.fromEntries(STRATEGIES.map((s) => [s, aggregate(results.filter((r) => r.strategy === s && untouched.includes(r.id)))])),
        };

        const best = STRATEGIES.reduce((a, b) => (byStrategy[b]!.ndcg10 > byStrategy[a]!.ndcg10 ? b : a));
        const worst = results.filter((r) => r.strategy === best).sort((a, b) => a.metrics.ndcg10 - b.metrics.ndcg10).slice(0, 10);
        const knownFailures = results.filter((r) => r.id.startsWith('kf-'));

        const report = {
            generatedAt: new Date().toISOString(),
            corpus: { products: qrelsFile.corpusProducts, embedded, model: embedder.id },
            labels: { generatedAt: qrelsFile.generatedAt, fingerprint: qrelsFile.queriesFingerprint, queries: EVAL_QUERIES.length },
            settings: { limit, ...fusion, terminologyEntries: TERMINOLOGY_ENTRIES },
            byStrategy, byCategory, byNormalisationReach,
            best, worstQueries: worst, knownFailures, perQuery: results,
        };
        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'retrieval-evaluation.json'), JSON.stringify(report, null, 2));

        const pad = (s: string, n: number) => s.padEnd(n);
        console.log(`\n${pad('strategy', 20)}${['recall@5', 'recall@10', 'prec@5', 'MRR', 'nDCG@10', 'zero%', 'p50ms', 'p95ms'].map((h) => h.padStart(10)).join('')}`);
        for (const s of STRATEGIES) {
            const a = byStrategy[s]!;
            console.log(pad(s, 20) + [a.recall5, a.recall10, a.precision5, a.mrr, a.ndcg10].map((v) => v.toFixed(3).padStart(10)).join('')
                + `${(100 * a.zeroResultRate).toFixed(1)}%`.padStart(10) + a.latencyP50.toFixed(1).padStart(10) + a.latencyP95.toFixed(1).padStart(10));
        }
        console.log(`\nbest by nDCG@10: ${best}`);
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
