/**
 * Deterministic query-term normalisation for lexical search.
 *
 * Purpose: separate "the lexical index and the corpus disagree about words"
 * from "the ranking needs semantics". Each entry is a general British/American
 * or retail/taxonomy equivalence, not a fix for one evaluation query. The list
 * is deliberately short and hand-checkable; it is not a synonym dictionary and
 * must not grow one entry per failing query.
 *
 * Open Food Facts' category vocabulary is largely American English ("candies",
 * "canned", "shrimps"), while UK shoppers type British English.
 */
const VARIANT_GROUPS: readonly (readonly string[])[] = [
    // British / American spellings
    ['yoghurt', 'yogurt'],
    ['yoghurts', 'yogurts'],
    ['flavour', 'flavor'],
    ['flavoured', 'flavored'],
    ['colour', 'color'],
    ['fibre', 'fiber'],
    ['savoury', 'savory'],
    ['doughnut', 'donut'],
    // British retail term / Open Food Facts taxonomy term
    ['tinned', 'canned'],
    ['fizzy', 'carbonated'],
    ['sweets', 'candies'],
    ['prawns', 'shrimps'],
    ['prawn', 'shrimp'],
    ['aubergine', 'eggplant'],
    ['courgette', 'zucchini'],
    ['coriander', 'cilantro'],
    ['porridge', 'oatmeal'],
    // closed vs open compounds
    ['cornflakes', 'corn flakes'],
    ['teabags', 'tea bags'],
    ['wholemeal', 'wholewheat', 'whole wheat'],
];

const VARIANTS = new Map<string, readonly string[]>();
for (const group of VARIANT_GROUPS) for (const term of group) VARIANTS.set(term, group);

export const TERMINOLOGY_ENTRIES = VARIANT_GROUPS.length;

/** Does this query contain any term the normaliser would expand? */
export function normalisationApplies(query: string): boolean {
    return expandQueryTerms(query).some((group) => group.length > 1);
}

/**
 * Query -> one group of alternatives per term, longest match first, so
 * "corn flakes" expands as a unit. Terms with no variants come back alone.
 */
export function expandQueryTerms(query: string): string[][] {
    const tokens = query.toLowerCase().match(/[a-z0-9']+/g) ?? [];
    const groups: string[][] = [];
    for (let i = 0; i < tokens.length;) {
        const bigram = i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : null;
        const bigramGroup = bigram ? VARIANTS.get(bigram) : undefined;
        if (bigramGroup) {
            groups.push([...bigramGroup]);
            i += 2;
            continue;
        }
        groups.push([...(VARIANTS.get(tokens[i]!) ?? [tokens[i]!])]);
        i += 1;
    }
    return groups;
}

/**
 * SQL for a tsquery where each term may match any of its variants:
 * "greek yoghurt" -> (plainto('greek')) && (plainto('yoghurt') || plainto('yogurt')).
 * Returns null when the query has no terms.
 */
export function normalisedTsQuerySql(query: string, params: unknown[]): string | null {
    const groups = expandQueryTerms(query);
    if (!groups.length) return null;
    return groups
        .map((group) => `(${group.map((term) => {
            params.push(term);
            return `plainto_tsquery('english', $${params.length})`;
        }).join(' || ')})`)
        .join(' && ');
}
