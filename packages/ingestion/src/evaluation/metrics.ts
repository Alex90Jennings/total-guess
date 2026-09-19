/**
 * Retrieval metrics, computed from a ranked list of barcodes and the query's
 * labels.
 *
 * Binary metrics (recall, precision, MRR) count only grade 2, "what the query
 * asked for". Grade 1 ("related, acceptable") earns partial credit in nDCG
 * only, so a strategy cannot look good by returning near-misses.
 *
 * Recall@k is capped: |relevant ∩ top k| / min(k, |relevant|). Some queries
 * have hundreds of relevant products ("crisps": 822), where plain recall@10
 * could never exceed 0.012 and would say nothing about ranking quality.
 */
export type Labels = Record<string, 1 | 2>;

export type QueryMetrics = {
    returned: number;
    relevantTotal: number;
    recall5: number;
    recall10: number;
    precision5: number;
    mrr: number;
    ndcg10: number;
    firstRelevantRank: number | null;
};

const gain = (grade: number) => (grade > 0 ? 2 ** grade - 1 : 0);

function dcg(grades: number[]): number {
    return grades.reduce((sum, g, i) => sum + gain(g) / Math.log2(i + 2), 0);
}

export function evaluateRanking(ranked: string[], labels: Labels, options: { ndcgAt?: number; mrrAt?: number } = {}): QueryMetrics {
    const ndcgAt = options.ndcgAt ?? 10;
    const mrrAt = options.mrrAt ?? 10;
    const grades = ranked.map((id) => labels[id] ?? 0);
    const relevantTotal = Object.values(labels).filter((g) => g === 2).length;

    const hitsAt = (k: number) => grades.slice(0, k).filter((g) => g === 2).length;
    const firstRelevantIndex = grades.findIndex((g) => g === 2);
    const firstRelevantRank = firstRelevantIndex === -1 ? null : firstRelevantIndex + 1;

    const idealGrades = Object.values(labels).sort((a, b) => b - a).slice(0, ndcgAt);
    const ideal = dcg(idealGrades);

    return {
        returned: ranked.length,
        relevantTotal,
        recall5: relevantTotal ? hitsAt(5) / Math.min(5, relevantTotal) : 0,
        recall10: relevantTotal ? hitsAt(10) / Math.min(10, relevantTotal) : 0,
        precision5: hitsAt(5) / 5,
        mrr: firstRelevantRank !== null && firstRelevantRank <= mrrAt ? 1 / firstRelevantRank : 0,
        ndcg10: ideal ? dcg(grades.slice(0, ndcgAt)) / ideal : 0,
        firstRelevantRank,
    };
}

export type Aggregate = {
    queries: number;
    recall5: number;
    recall10: number;
    precision5: number;
    mrr: number;
    ndcg10: number;
    zeroResultRate: number;
    latencyP50: number;
    latencyP95: number;
};

export function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    // Nearest-rank percentile.
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index]!;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

export function aggregate(results: { metrics: QueryMetrics; latencyMs: number }[]): Aggregate {
    return {
        queries: results.length,
        recall5: mean(results.map((r) => r.metrics.recall5)),
        recall10: mean(results.map((r) => r.metrics.recall10)),
        precision5: mean(results.map((r) => r.metrics.precision5)),
        mrr: mean(results.map((r) => r.metrics.mrr)),
        ndcg10: mean(results.map((r) => r.metrics.ndcg10)),
        zeroResultRate: results.length ? results.filter((r) => r.metrics.returned === 0).length / results.length : 0,
        latencyP50: percentile(results.map((r) => r.latencyMs), 50),
        latencyP95: percentile(results.map((r) => r.latencyMs), 95),
    };
}
