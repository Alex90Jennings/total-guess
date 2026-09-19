/**
 * Scoring a query plan, field by field.
 *
 * "The answer looked good" is not a measurement. Planning is scored on its own
 * terms — did it identify the intent, did it decompose the request, did it ask
 * for the right constraints — so a failure can be attributed to the planner
 * rather than blamed on the writer, or vice versa.
 */
import type { RetrievalFilters } from '../../retrieval/filters.js';
import type { RetrievalPlan } from '../plan.js';
import type { AssistantCase } from './cases.js';

export type PlanScore = {
    id: string;
    category: string;
    intent: boolean;
    /** At least one search matched what the case expects. */
    searchMatched: boolean;
    /** No search matched a term the decomposition exists to avoid. */
    searchAvoided: boolean;
    /** Field-level filter agreement, only counted for cases that specify filters. */
    nutrition: boolean | null;
    dietary: boolean | null;
    allergens: boolean | null;
    /** Everything above that applies to this case. */
    exact: boolean;
    detail: string[];
};

const NUTRITION_KEYS = ['minProteinG100', 'maxKcal100', 'maxSaltG100', 'maxSugarsG100', 'maxFatG100', 'maxSaturatesG100', 'minFibreG100'] as const;

const sameNumbers = (a: RetrievalFilters, b: RetrievalFilters) =>
    NUTRITION_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));

const sameDietary = (a: RetrievalFilters, b: RetrievalFilters) => {
    const norm = (f: RetrievalFilters) => JSON.stringify({
        vegan: f.dietary?.vegan ?? false, vegetarian: f.dietary?.vegetarian ?? false, glutenFree: f.dietary?.glutenFree ?? false,
    });
    return norm(a) === norm(b);
};

const sameAllergens = (a: RetrievalFilters, b: RetrievalFilters) =>
    JSON.stringify([...(a.excludeAllergens ?? [])].sort()) === JSON.stringify([...(b.excludeAllergens ?? [])].sort());

export function scorePlan(testCase: AssistantCase, plan: RetrievalPlan, applied: RetrievalFilters): PlanScore {
    const queries = plan.searches.map((s) => s.query);
    const detail: string[] = [];

    const intent = plan.intent === testCase.intent;
    if (!intent) detail.push(`intent ${plan.intent}, expected ${testCase.intent}`);

    const searchMatched = testCase.searchMatches.some((re) => queries.some((q) => re.test(q)));
    if (!searchMatched) detail.push(`no search matched: ${queries.join(' | ')}`);

    const avoided = testCase.searchAvoids ?? [];
    const offending = queries.filter((q) => avoided.some((re) => re.test(q)));
    const searchAvoided = offending.length === 0;
    if (!searchAvoided) detail.push(`searched the thing it should not: ${offending.join(' | ')}`);

    const expected = testCase.filters;
    const nutrition = expected ? sameNumbers(expected, applied) : null;
    const dietary = expected ? sameDietary(expected, applied) : null;
    const allergens = expected ? sameAllergens(expected, applied) : null;
    if (expected && !(nutrition && dietary && allergens)) {
        detail.push(`filters ${JSON.stringify(applied)}, expected ${JSON.stringify(expected)}`);
    }

    return {
        id: testCase.id, category: testCase.category,
        intent, searchMatched, searchAvoided,
        nutrition, dietary, allergens,
        exact: intent && searchMatched && searchAvoided && (nutrition ?? true) && (dietary ?? true) && (allergens ?? true),
        detail,
    };
}

const rate = (values: boolean[]) => (values.length ? values.filter(Boolean).length / values.length : 0);

export function aggregatePlanScores(scores: PlanScore[]) {
    const defined = (pick: (s: PlanScore) => boolean | null) =>
        scores.map(pick).filter((v): v is boolean => v !== null);
    return {
        cases: scores.length,
        intent: rate(scores.map((s) => s.intent)),
        searchMatched: rate(scores.map((s) => s.searchMatched)),
        searchAvoided: rate(scores.map((s) => s.searchAvoided)),
        nutrition: rate(defined((s) => s.nutrition)),
        dietary: rate(defined((s) => s.dietary)),
        allergens: rate(defined((s) => s.allergens)),
        exact: rate(scores.map((s) => s.exact)),
    };
}
