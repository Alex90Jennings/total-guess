import { describe, expect, it } from 'vitest';
import { aggregate, evaluateRanking, percentile } from '../../src/evaluation/metrics.js';
import { HashingEmbedder, normalise } from '../../src/embeddings/embedder.js';
import { reciprocalRankFusion } from '../../src/retrieval/rrf.js';
import { expandQueryTerms, normalisationApplies, normalisedTsQuerySql } from '../../src/retrieval/terminology.js';

describe('terminology normalisation', () => {
    it.each<[string, string[][]]>([
        ['greek yoghurt', [['greek'], ['yoghurt', 'yogurt']]],
        ['greek yogurt', [['greek'], ['yoghurt', 'yogurt']]],
        ['tinned tuna', [['tinned', 'canned'], ['tuna']]],
        ['cornflakes', [['cornflakes', 'corn flakes']]],
        ['corn flakes', [['cornflakes', 'corn flakes']]], // matched as a unit, longest first
        ['chicken breast', [['chicken'], ['breast']]],
    ])('%s expands to %j', (query, expected) => {
        expect(expandQueryTerms(query)).toEqual(expected);
    });

    it('knows which queries it can affect at all', () => {
        expect(normalisationApplies('tinned tuna')).toBe(true);
        expect(normalisationApplies('chicken breast')).toBe(false);
    });

    it('builds an AND of ORs, with every term bound as a parameter', () => {
        const params: unknown[] = [];
        const sql = normalisedTsQuerySql('greek yoghurt', params);
        expect(sql).toBe("(plainto_tsquery('english', $1)) && (plainto_tsquery('english', $2) || plainto_tsquery('english', $3))");
        expect(params).toEqual(['greek', 'yoghurt', 'yogurt']);
        expect(normalisedTsQuerySql('   ', [])).toBeNull();
    });
});

describe('reciprocal rank fusion', () => {
    it('rewards agreement between lists', () => {
        const fused = reciprocalRankFusion([{ items: ['a', 'b', 'c'] }, { items: ['c', 'b', 'z'] }], { k: 60 });
        // Documents in both lists outrank documents in one, even when one list ranks them last:
        // c = 1/63 + 1/61 = 0.03227 just beats b = 2/62 = 0.03226, and both beat a = 1/61.
        expect(fused.map((f) => f.id)).toEqual(['c', 'b', 'a', 'z']);
        expect(fused[0]!.ranks).toEqual([3, 1]);
        expect(fused.find((f) => f.id === 'a')!.ranks).toEqual([1, null]);
        expect(fused.find((f) => f.id === 'a')!.score).toBeGreaterThan(fused.find((f) => f.id === 'z')!.score);
    });

    it('weights lists and is deterministic on ties', () => {
        const weighted = reciprocalRankFusion([{ items: ['a'], weight: 3 }, { items: ['b'] }], { k: 60 });
        expect(weighted.map((f) => f.id)).toEqual(['a', 'b']);
        const tied = reciprocalRankFusion([{ items: ['b', 'a'] }, { items: ['a', 'b'] }]);
        expect(tied.map((f) => f.id)).toEqual(['a', 'b']);
    });

    it('keeps the best rank of a repeated document, and rejects k <= 0', () => {
        expect(reciprocalRankFusion([{ items: ['a', 'a'] }])[0]!.ranks).toEqual([1]);
        expect(() => reciprocalRankFusion([{ items: ['a'] }], { k: 0 })).toThrow();
    });
});

describe('evaluation metrics', () => {
    const labels = { p1: 2, p2: 2, p3: 1 } as const;

    it('counts only grade 2 for binary metrics, and caps recall by the number relevant', () => {
        const m = evaluateRanking(['p1', 'x', 'p3', 'p2', 'y', 'z'], labels);
        expect(m.precision5).toBe(2 / 5);       // p1 and p2 in the top 5
        expect(m.recall5).toBe(1);              // both grade-2 products found; min(5, 2) = 2
        expect(m.mrr).toBe(1);
        expect(m.firstRelevantRank).toBe(1);
    });

    it('gives partial credit to grade 1 in nDCG only', () => {
        const partialOnly = evaluateRanking(['p3'], labels);
        expect(partialOnly.precision5).toBe(0);
        expect(partialOnly.mrr).toBe(0);
        expect(partialOnly.ndcg10).toBeGreaterThan(0);
        expect(partialOnly.ndcg10).toBeLessThan(1);
    });

    it('is 1 for the ideal ranking and 0 for a miss', () => {
        expect(evaluateRanking(['p1', 'p2', 'p3'], labels).ndcg10).toBeCloseTo(1, 10);
        const miss = evaluateRanking(['x', 'y'], labels);
        expect([miss.ndcg10, miss.mrr, miss.recall10, miss.precision5]).toEqual([0, 0, 0, 0]);
    });

    it('scores a relevant item found later below one found first', () => {
        expect(evaluateRanking(['x', 'p1'], labels).mrr).toBe(0.5);
        expect(evaluateRanking(['x', 'p1'], labels).ndcg10).toBeLessThan(evaluateRanking(['p1'], labels).ndcg10);
    });

    it('aggregates, including zero-result rate and latency percentiles', () => {
        const a = aggregate([
            { metrics: evaluateRanking(['p1'], labels), latencyMs: 10 },
            { metrics: evaluateRanking([], labels), latencyMs: 100 },
        ]);
        expect(a.queries).toBe(2);
        expect(a.zeroResultRate).toBe(0.5);
        expect(a.latencyP50).toBe(10);
        expect(a.latencyP95).toBe(100);
        expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
        expect(percentile([], 50)).toBe(0);
    });
});

describe('hashing embedder (test double)', () => {
    it('is deterministic, unit length and dimension-correct', async () => {
        const embedder = new HashingEmbedder(32);
        const [a, b] = await embedder.embedDocuments(['baked beans', 'baked beans']);
        expect(a).toEqual(b);
        expect(a).toHaveLength(32);
        expect(Math.hypot(...a!)).toBeCloseTo(1, 10);
        expect(await embedder.embedQuery('baked beans')).toEqual(a);
    });

    it('normalise leaves a zero vector alone', () => {
        expect(normalise([0, 0])).toEqual([0, 0]);
    });
});
