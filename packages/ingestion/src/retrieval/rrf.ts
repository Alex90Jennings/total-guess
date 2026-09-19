/**
 * Reciprocal Rank Fusion: combine ranked lists without comparing their
 * scores, which are not on the same scale (ts_rank_cd vs cosine distance).
 *
 *   score(d) = Σ_lists weight / (k + rank(d))      rank starting at 1
 *
 * k (60 by default, as in the original paper) damps the top ranks so one
 * list cannot dominate. Ties break on id, so results are deterministic.
 */
export type FusionInput = { items: string[]; weight?: number };

export type FusedResult = { id: string; score: number; ranks: (number | null)[] };

export function reciprocalRankFusion(lists: FusionInput[], options: { k?: number } = {}): FusedResult[] {
    const k = options.k ?? 60;
    if (k <= 0) throw new Error('RRF k must be positive');
    const scores = new Map<string, FusedResult>();
    lists.forEach((list, listIndex) => {
        const weight = list.weight ?? 1;
        list.items.forEach((id, index) => {
            const entry = scores.get(id) ?? { id, score: 0, ranks: lists.map(() => null) };
            // A document repeated within one list keeps its best rank.
            if (entry.ranks[listIndex] === null) {
                entry.ranks[listIndex] = index + 1;
                entry.score += weight / (k + index + 1);
            }
            scores.set(id, entry);
        });
    });
    return [...scores.values()].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
