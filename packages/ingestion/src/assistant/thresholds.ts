/**
 * What vague nutrition words are allowed to mean.
 *
 * The model may not decide that "high protein" is 35 g/100 g today and 15 g
 * tomorrow, and it may never invent a number the user did not give. So the
 * mapping lives here, in code, and is applied deterministically to the user's
 * own words — the plan the model produces is checked against it.
 *
 * Two bases are distinguished, because honesty about it matters:
 *
 *   eu_claim   the threshold in Regulation (EC) No 1924/2006 for the
 *              corresponding nutrition claim, applied as written.
 *   project    a pragmatic project threshold, because the regulated claim is
 *              either energy-relative (so not expressible as g/100 g) or so
 *              strict that it answers no realistic shopping question.
 *
 * Anything on a `project` basis is a house rule, not a legal claim, and the
 * assistant must state the number it used rather than repeat the vague word.
 */
import type { RetrievalFilters } from '../retrieval/filters.js';

export type ThresholdBasis = 'eu_claim' | 'project';

export type NutritionThreshold = {
    /** The words in a user's request that trigger it. */
    match: RegExp;
    filter: keyof Pick<RetrievalFilters, 'minProteinG100' | 'maxKcal100' | 'maxSaltG100' | 'maxSugarsG100' | 'maxFatG100' | 'maxSaturatesG100' | 'minFibreG100'>;
    value: number;
    unit: string;
    basis: ThresholdBasis;
    /** How the assistant must describe it, so prose never says "high protein" unqualified. */
    phrase: string;
    note: string;
};

export const NUTRITION_THRESHOLDS: NutritionThreshold[] = [
    {
        match: /\b(high[- ]protein|protein[- ]rich|lots of protein|plenty of protein)\b/i,
        filter: 'minProteinG100', value: 20, unit: 'g/100g', basis: 'project',
        phrase: 'at least 20 g protein per 100 g',
        note: 'The regulated "high protein" claim is 20% of energy from protein, which depends on energy and cannot be a g/100 g filter. 20 g/100 g is a stricter, simpler proxy.',
    },
    {
        match: /\b(some protein|source of protein|decent protein)\b/i,
        filter: 'minProteinG100', value: 12, unit: 'g/100g', basis: 'project',
        phrase: 'at least 12 g protein per 100 g',
        note: 'Mirrors the "source of protein" claim (12% of energy) as a g/100 g proxy.',
    },
    {
        match: /\b(low[- ]calorie|low[- ]cal|light|fewer calories)\b/i,
        filter: 'maxKcal100', value: 150, unit: 'kcal/100g', basis: 'project',
        phrase: 'no more than 150 kcal per 100 g',
        note: 'The regulated "low energy" claim is 40 kcal/100 g, which excludes essentially every snack and would answer no realistic question. 150 kcal/100 g is a house rule.',
    },
    {
        match: /\b(low[- ]salt|low[- ]sodium|less salt|reduced salt)\b/i,
        filter: 'maxSaltG100', value: 0.3, unit: 'g/100g', basis: 'project',
        phrase: 'no more than 0.3 g salt per 100 g',
        note: 'The regulated "low sodium/salt" claim is 0.12 g salt/100 g. That is met by almost no tinned or prepared food, so 0.3 g/100 g is used and stated explicitly.',
    },
    {
        match: /\b(low[- ]sugar|no added sugar|less sugar|reduced sugar)\b/i,
        filter: 'maxSugarsG100', value: 5, unit: 'g/100g', basis: 'eu_claim',
        phrase: 'no more than 5 g sugars per 100 g',
        note: 'The regulated "low sugars" threshold for solids.',
    },
    {
        match: /\b(low[- ]fat|less fat|reduced fat)\b/i,
        filter: 'maxFatG100', value: 3, unit: 'g/100g', basis: 'eu_claim',
        phrase: 'no more than 3 g fat per 100 g',
        note: 'The regulated "low fat" threshold for solids.',
    },
    {
        match: /\b(high[- ]fibre|high[- ]fiber|fibre[- ]rich)\b/i,
        filter: 'minFibreG100', value: 6, unit: 'g/100g', basis: 'eu_claim',
        phrase: 'at least 6 g fibre per 100 g',
        note: 'The regulated "high fibre" threshold.',
    },
];

/** Thresholds whose trigger words appear in the user's request. */
export function thresholdsFor(query: string): NutritionThreshold[] {
    return NUTRITION_THRESHOLDS.filter((t) => t.match.test(query));
}

/**
 * Numbers the user actually stated, e.g. "under 300 calories per 100g",
 * "at least 20g of protein", "less than 1g salt". Only these, and the
 * thresholds above, may become numeric filters.
 */
const EXPLICIT_PATTERNS: { re: RegExp; filter: NutritionThreshold['filter'] }[] = [
    { re: /(\d+(?:\.\d+)?)\s*(?:g(?:rams?)?)?\s*(?:of\s+)?protein/i, filter: 'minProteinG100' },
    { re: /(\d+(?:\.\d+)?)\s*(?:kcal|calories|cals)/i, filter: 'maxKcal100' },
    { re: /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s+)?salt/i, filter: 'maxSaltG100' },
    { re: /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s+)?sugars?/i, filter: 'maxSugarsG100' },
    { re: /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s+)?fat/i, filter: 'maxFatG100' },
    { re: /(\d+(?:\.\d+)?)\s*g(?:rams?)?\s*(?:of\s+)?fibre/i, filter: 'minFibreG100' },
];

export function explicitNumbers(query: string): Partial<Record<NutritionThreshold['filter'], number>> {
    const found: Partial<Record<NutritionThreshold['filter'], number>> = {};
    for (const { re, filter } of EXPLICIT_PATTERNS) {
        const m = re.exec(query);
        if (m?.[1] !== undefined) found[filter] = Number(m[1]);
    }
    return found;
}
