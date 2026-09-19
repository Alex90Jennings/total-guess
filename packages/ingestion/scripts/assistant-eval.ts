/**
 * Runs the assistant development set against a live model and writes
 * .captures/reports/assistant-evaluation.json.
 *
 *   yarn workspace @total-guess/ingestion assistant:eval [--limit N] [--routing rules|model] [--only id,id]
 *
 * This is the only command that calls a paid API. The test suite never does.
 * Three things are measured separately, because they fail separately:
 *
 *   1. query planning   intent, decomposition, constraints (vs the case labels)
 *   2. grounding        every product, number and claim in the prose (mechanical)
 *   3. usefulness       planned retrieval vs retrieval of the raw sentence
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAssistant, type AssistantRun } from '../src/assistant/assistant.js';
import { liveModel, assistantConfig } from '../src/assistant/config.js';
import { aggregatePlanScores, scorePlan, type PlanScore } from '../src/assistant/evaluation/planMetrics.js';
import type { AssistantCase } from '../src/assistant/evaluation/cases.js';
import { costUsd } from '../src/assistant/model.js';
import type { RoutingMode } from '../src/assistant/routing.js';
import { openDatabase } from '../src/db/client.js';
import { recordAssistantRun } from '../src/db/assistantRuns.js';
import { LocalEmbedder } from '../src/embeddings/localEmbedder.js';
import { grade, type LabelProduct } from '../src/evaluation/dataset.js';
import { percentile } from '../src/evaluation/metrics.js';
import { searchProducts } from '../src/retrieval/search.js';
import { ASSISTANT_CASES } from '../evaluation/assistant/cases.js';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

type Db = Awaited<ReturnType<typeof openDatabase>>;

/** Products by barcode, with what the relevance rules need. */
async function labelProducts(db: Db, barcodes: string[]): Promise<Map<string, LabelProduct>> {
    const out = new Map<string, LabelProduct>();
    if (!barcodes.length) return out;
    const { rows } = await db.query<{ barcode: string; name: string; brand: string | null; categories: string[] }>(
        `SELECT p.barcode, p.name, p.brand, coalesce(array_agg(c.category_id) FILTER (WHERE c.category_id IS NOT NULL), '{}') AS categories
         FROM product p LEFT JOIN product_category c USING (barcode)
         WHERE p.barcode = ANY($1::text[]) GROUP BY p.barcode, p.name, p.brand`, [barcodes]);
    for (const row of rows) out.set(row.barcode, { barcode: row.barcode, name: row.name, brand: row.brand, categories: row.categories });
    return out;
}

/** Fraction of the top k that the case's rules call relevant. */
function precisionAt(ids: string[], products: Map<string, LabelProduct>, testCase: AssistantCase, k: number): number {
    const top = ids.slice(0, k);
    if (!top.length || !testCase.relevant) return 0;
    const query = { id: testCase.id, category: testCase.category, text: testCase.query, relevant: testCase.relevant };
    const hits = top.filter((id) => {
        const product = products.get(id);
        return product ? grade(query as never, product) === 2 : false;
    });
    return hits.length / Math.min(k, top.length);
}

/** Mechanical checks on the finished answer, beyond the grounding validator that already ran. */
function auditAnswer(testCase: AssistantCase, run: AssistantRun) {
    const answer = run.answer.toLowerCase();
    const checks: Record<string, boolean | null> = {
        grounded: run.violations.length === 0,
        citedAllRetrieved: run.citedIds.every((id) => run.retrievedIds.includes(id)),
        refusedPrice: testCase.expect?.refusesPrice
            ? /no current price|do not have (current )?price|cannot say (what|which)|don't have price|no price data/.test(answer)
            : null,
        saidNothingMatched: testCase.expect?.expectsNoProducts
            ? run.selectedIds.length === 0 || /(no|nothing|not) (products?|matches?|match|found|in the catalogue)/.test(answer)
            : null,
        avoidedFreeFrom: testCase.expect?.forbidsFreeFrom
            ? !/\b(free[- ]from|[a-z]+-free|contains no|safe for)\b/.test(answer) || /check the pack|not a guarantee|no allergens? (are )?listed/.test(answer)
            : null,
    };
    return checks;
}

async function main() {
    const config = assistantConfig();
    const routing = (arg('routing') ?? 'rules') as RoutingMode;
    const only = arg('only')?.split(',');
    const limit = arg('limit') ? Number(arg('limit')) : undefined;
    const cases = ASSISTANT_CASES.filter((c) => !only || only.includes(c.id)).slice(0, limit);

    const model = liveModel(config.model);           // throws with instructions if no key is configured
    const db = await openDatabase();
    const embedder = new LocalEmbedder();
    try {
        await embedder.warmUp();
        const results: {
            case: AssistantCase; run: AssistantRun; plan: PlanScore;
            audit: Record<string, boolean | null>;
            comparison: { plannedPrecision5: number; baselinePrecision5: number; plannedIds: string[]; baselineIds: string[] } | null;
        }[] = [];

        for (const testCase of cases) {
            const run = await runAssistant(db, { planner: model }, testCase.query, { routing, embedder });
            await recordAssistantRun(db, run);
            const plan = scorePlan(testCase, run.plan, run.filters.applied as never);

            let comparison = null;
            if (testCase.relevant) {
                // A: the raw sentence, retrieved directly — the previous phase's best strategy.
                const baseline = await searchProducts(db, { query: testCase.query, strategy: 'hybrid_normalised', limit: 10 }, { embedder });
                const baselineIds = baseline.map((h) => h.barcode);
                const plannedIds = run.retrievedIds;
                const products = await labelProducts(db, [...new Set([...baselineIds, ...plannedIds])]);
                comparison = {
                    plannedPrecision5: precisionAt(plannedIds, products, testCase, 5),
                    baselinePrecision5: precisionAt(baselineIds, products, testCase, 5),
                    plannedIds: plannedIds.slice(0, 5), baselineIds: baselineIds.slice(0, 5),
                };
            }
            results.push({ case: testCase, run, plan, audit: auditAnswer(testCase, run), comparison });
            process.stderr.write(`${testCase.id.padEnd(26)} plan ${plan.exact ? 'ok ' : 'no '} grounded ${run.violations.length === 0 ? 'ok ' : 'no '} ${Math.round(run.latencyMs.total)}ms\n`);
        }

        const categories = [...new Set(cases.map((c) => c.category))];
        const totals = results.reduce((acc, r) => ({
            inputTokens: acc.inputTokens + r.run.usage.total.inputTokens,
            outputTokens: acc.outputTokens + r.run.usage.total.outputTokens,
        }), { inputTokens: 0, outputTokens: 0 });
        const withComparison = results.filter((r) => r.comparison);
        const checked = (key: string) => results.map((r) => r.audit[key]).filter((v): v is boolean => v !== null);
        const rate = (values: boolean[]) => (values.length ? values.filter(Boolean).length / values.length : 0);
        const latencies = (pick: (r: AssistantRun) => number) => ({
            p50: Math.round(percentile(results.map((r) => pick(r.run)), 50)),
            p95: Math.round(percentile(results.map((r) => pick(r.run)), 95)),
        });

        const report = {
            generatedAt: new Date().toISOString(),
            model: model.id, routing, cases: results.length,
            planning: {
                overall: aggregatePlanScores(results.map((r) => r.plan)),
                byCategory: Object.fromEntries(categories.map((c) =>
                    [c, aggregatePlanScores(results.filter((r) => r.case.category === c).map((r) => r.plan))])),
                failures: results.filter((r) => !r.plan.exact).map((r) => ({ id: r.case.id, query: r.case.query, detail: r.plan.detail, plan: r.run.plan })),
            },
            grounding: {
                answersWithoutViolations: rate(results.map((r) => r.run.violations.length === 0)),
                fabricatedProductIds: results.flatMap((r) => r.run.violations.filter((v) => v.kind === 'unknown_product_id')).length,
                unsupportedNumbers: results.flatMap((r) => r.run.violations.filter((v) => v.kind === 'unverified_number' || v.kind === 'wrong_number')).length,
                unsupportedDietary: results.flatMap((r) => r.run.violations.filter((v) => v.kind === 'unsupported_dietary' || v.kind === 'overstated_dietary')).length,
                unsupportedAllergen: results.flatMap((r) => r.run.violations.filter((v) => v.kind === 'unsupported_allergen')).length,
                priceClaims: results.flatMap((r) => r.run.violations.filter((v) => v.kind === 'price_claim')).length,
                correctedOnRetry: results.filter((r) => r.run.retriedViolations.length > 0 && r.run.violations.length === 0).length,
                refusedPriceWhenAsked: rate(checked('refusedPrice')),
                saidNothingMatched: rate(checked('saidNothingMatched')),
                avoidedFreeFromWording: rate(checked('avoidedFreeFrom')),
                violations: results.filter((r) => r.run.violations.length).map((r) => ({ id: r.case.id, violations: r.run.violations })),
            },
            comparison: {
                cases: withComparison.length,
                plannedPrecision5: withComparison.reduce((s, r) => s + r.comparison!.plannedPrecision5, 0) / (withComparison.length || 1),
                baselinePrecision5: withComparison.reduce((s, r) => s + r.comparison!.baselinePrecision5, 0) / (withComparison.length || 1),
                perCase: withComparison.map((r) => ({ id: r.case.id, query: r.case.query, ...r.comparison! })),
            },
            latency: {
                planning: latencies((r) => r.latencyMs.planning),
                retrieval: latencies((r) => r.latencyMs.retrieval),
                generation: latencies((r) => r.latencyMs.generation),
                total: latencies((r) => r.latencyMs.total),
            },
            cost: {
                inputTokens: totals.inputTokens, outputTokens: totals.outputTokens,
                totalUsd: Number(results.reduce((s, r) => s + r.run.costUsd, 0).toFixed(4)),
                perQueryUsd: Number((results.reduce((s, r) => s + r.run.costUsd, 0) / (results.length || 1)).toFixed(5)),
                pricing: model.pricing,
                oneMillionQueriesUsd: Math.round(costUsd(
                    { inputTokens: totals.inputTokens / results.length * 1e6, outputTokens: totals.outputTokens / results.length * 1e6 },
                    model.pricing)),
            },
            runs: results.map((r) => ({
                id: r.case.id, category: r.case.category, query: r.case.query,
                plan: r.run.plan, filters: r.run.filters, searches: r.run.searches,
                answer: r.run.answer, citedIds: r.run.citedIds, violations: r.run.violations,
                planScore: r.plan, audit: r.audit, comparison: r.comparison,
                latencyMs: r.run.latencyMs, usage: r.run.usage.total, costUsd: r.run.costUsd,
            })),
        };

        mkdirSync(join(here, '..', '.captures', 'reports'), { recursive: true });
        writeFileSync(join(here, '..', '.captures', 'reports', 'assistant-evaluation.json'), JSON.stringify(report, null, 2));

        const pct = (v: number) => `${(100 * v).toFixed(1)}%`;
        console.log(`\n${results.length} cases, ${model.id}, routing=${routing}`);
        console.log(`\nPLANNING       intent ${pct(report.planning.overall.intent)}  decomposed ${pct(report.planning.overall.searchMatched)}`
            + `  avoided-trap ${pct(report.planning.overall.searchAvoided)}  nutrition ${pct(report.planning.overall.nutrition)}`
            + `  dietary ${pct(report.planning.overall.dietary)}  allergens ${pct(report.planning.overall.allergens)}  exact ${pct(report.planning.overall.exact)}`);
        console.log(`GROUNDING      clean ${pct(report.grounding.answersWithoutViolations)}  fabricated ids ${report.grounding.fabricatedProductIds}`
            + `  bad numbers ${report.grounding.unsupportedNumbers}  price claims ${report.grounding.priceClaims}`);
        console.log(`USEFULNESS     planned P@5 ${report.comparison.plannedPrecision5.toFixed(3)} vs baseline ${report.comparison.baselinePrecision5.toFixed(3)} (${report.comparison.cases} cases)`);
        console.log(`LATENCY p50/p95  plan ${report.latency.planning.p50}/${report.latency.planning.p95}ms`
            + `  retrieval ${report.latency.retrieval.p50}/${report.latency.retrieval.p95}ms`
            + `  generation ${report.latency.generation.p50}/${report.latency.generation.p95}ms`
            + `  total ${report.latency.total.p50}/${report.latency.total.p95}ms`);
        console.log(`COST           $${report.cost.totalUsd} total, $${report.cost.perQueryUsd}/query`);
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
});
