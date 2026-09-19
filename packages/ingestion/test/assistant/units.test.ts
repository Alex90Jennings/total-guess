import { describe, expect, it } from 'vitest';
import { validateAnswer, type Violation } from '../../src/assistant/grounding.js';
import { planRetrieval } from '../../src/assistant/planner.js';
import { retrievalPlanSchema, toRetrievalFilters } from '../../src/assistant/plan.js';
import { decideStrategy, routeStrategy } from '../../src/assistant/routing.js';
import { ScriptedModel } from '../../src/assistant/scriptedModel.js';
import { explicitNumbers, thresholdsFor } from '../../src/assistant/thresholds.js';
import { costUsd } from '../../src/assistant/model.js';
import type { ProductFacts } from '../../src/assistant/tools.js';

const validPlan = {
    intent: 'ingredient',
    searches: [{ query: 'cheddar cheese', purpose: 'melts in a toastie' }],
    filters: {},
};

const kinds = (violations: Violation[]) => violations.map((v) => v.kind);

const facts = (overrides: Partial<ProductFacts> = {}): ProductFacts => ({
    productId: '05000000000005',
    name: 'Test Farm Baked Beans',
    brand: 'Test Farm',
    quantity: '415 g',
    ingredients: 'Beans, Tomatoes, Water',
    nutrition: { per: '100g', values: { energyKcal: 78, fatG: 0.3, saturatesG: 0.1, carbohydrateG: 12.5, sugarsG: 4.1, fibreG: 3.7, proteinG: 4.7, saltG: 0.6 }, derived: [] },
    dietary: { claims: ['vegan', 'vegetarian'], vegan: 'yes', vegetarian: 'yes', basis: 'claim', inferredBy: null },
    allergens: { status: 'listed', contains: ['gluten'], mayContain: [], unrecognised: [] },
    image: null,
    ...overrides,
});

describe('RetrievalPlan validation', () => {
    it('accepts a well-formed plan and rejects anything outside the schema', () => {
        expect(retrievalPlanSchema.parse(validPlan).searches).toHaveLength(1);
        expect(() => retrievalPlanSchema.parse({ ...validPlan, intent: 'buy_it_for_me' })).toThrow();
        expect(() => retrievalPlanSchema.parse({ ...validPlan, searches: [] })).toThrow();
        expect(() => retrievalPlanSchema.parse({ ...validPlan, strategy: 'sql' })).toThrow();
        expect(() => retrievalPlanSchema.parse({ ...validPlan, filters: { minProteinG100: -5 } })).toThrow();
        expect(() => retrievalPlanSchema.parse({ ...validPlan, filters: { excludeAllergens: ['dairy'] } })).toThrow();
        // Anything not in the schema at all, e.g. an attempt to name products or write SQL.
        expect(() => retrievalPlanSchema.parse({ ...validPlan, productIds: ['05000000000005'] })).toThrow();
        expect(() => retrievalPlanSchema.parse({ ...validPlan, sql: 'SELECT 1' })).toThrow();
    });

    it('caps decomposition so one request cannot fan out indefinitely', () => {
        const many = Array.from({ length: 5 }, (_, i) => ({ query: `q${i}`, purpose: 'p' }));
        expect(() => retrievalPlanSchema.parse({ ...validPlan, searches: many })).toThrow();
    });
});

describe('numeric filters come from the user, not the model', () => {
    it('maps a documented vague phrase to its documented value', () => {
        const audit = toRetrievalFilters(retrievalPlanSchema.parse({ ...validPlan, filters: { minProteinG100: 20 } }), 'high protein snacks');
        expect(audit.applied.minProteinG100).toBe(20);
        expect(audit.thresholdsUsed[0]!.phrase).toBe('at least 20 g protein per 100 g');
        expect(audit.dropped).toEqual([]);
    });

    it('corrects a threshold the model got wrong', () => {
        const audit = toRetrievalFilters(retrievalPlanSchema.parse({ ...validPlan, filters: { minProteinG100: 35 } }), 'high protein snacks');
        expect(audit.applied.minProteinG100).toBe(20);
        expect(audit.corrected).toEqual([{ filter: 'minProteinG100', from: 35, to: 20 }]);
    });

    it("prefers the user's own number over the model's", () => {
        const audit = toRetrievalFilters(retrievalPlanSchema.parse({ ...validPlan, filters: { maxKcal100: 250 } }), 'cereal under 400 kcal per 100g');
        expect(audit.applied.maxKcal100).toBe(400);
        expect(audit.corrected).toEqual([{ filter: 'maxKcal100', from: 250, to: 400 }]);
    });

    it('drops a filter the request never asked for', () => {
        const audit = toRetrievalFilters(retrievalPlanSchema.parse({ ...validPlan, filters: { maxSaltG100: 0.1 } }), 'baked beans');
        expect(audit.applied.maxSaltG100).toBeUndefined();
        expect(audit.dropped).toEqual([{ filter: 'maxSaltG100', value: 0.1, reason: 'not_stated_by_user' }]);
    });

    it('keeps dietary policy and allergen conservatism in our hands', () => {
        const audit = toRetrievalFilters(
            retrievalPlanSchema.parse({ ...validPlan, filters: { vegan: true, glutenFree: true, excludeAllergens: ['peanuts', 'peanuts'] } }),
            'vegan gluten free nut free snacks',
        );
        expect(audit.applied.dietary).toEqual({ vegan: true, glutenFree: true, policy: 'claims_or_inferred' });
        expect(audit.applied.excludeAllergens).toEqual(['peanuts']);
    });

    it('reads thresholds and explicit numbers out of the request', () => {
        expect(thresholdsFor('low salt beans').map((t) => t.filter)).toEqual(['maxSaltG100']);
        expect(thresholdsFor('beans')).toEqual([]);
        expect(explicitNumbers('at least 20g of protein and under 300 kcal')).toEqual({ minProteinG100: 20, maxKcal100: 300 });
    });
});

describe('routing', () => {
    it.each([
        ['exact_product', 'heinz baked beans', 'fts_normalised'],
        ['similarity', 'something like hummus', 'vector'],
        ['category', 'milk', 'fts_normalised'],
        ['category', 'greek style yoghurt with honey', 'hybrid_normalised'],
        ['meal_use', 'cheese', 'hybrid_normalised'],
        ['discovery', 'nice snacks', 'hybrid_normalised'],
    ] as const)('%s / "%s" routes to %s', (intent, query, expected) => {
        expect(routeStrategy(intent, query).strategy).toBe(expected);
    });

    it('ignores the model’s suggestion unless routing is set to the model', () => {
        expect(decideStrategy('exact_product', 'marmite', 'vector', 'rules').strategy).toBe('fts_normalised');
        expect(decideStrategy('exact_product', 'marmite', 'vector', 'model').strategy).toBe('vector');
        // No suggestion: the rule decides in either mode.
        expect(decideStrategy('exact_product', 'marmite', undefined, 'model').strategy).toBe('fts_normalised');
    });
});

describe('the planner survives a bad model', () => {
    it('repairs one invalid plan', async () => {
        const model = new ScriptedModel([{ json: { intent: 'nonsense' } }, { json: validPlan }]);
        const result = await planRetrieval(model, 'cheese for a toastie');
        expect(result).toMatchObject({ repaired: true, fallback: false, attempts: 2 });
        expect(result.plan.searches[0]!.query).toBe('cheddar cheese');
        expect(result.usage.inputTokens).toBeGreaterThan(0);
    });

    it('falls back to searching the request as written when the model cannot be used', async () => {
        const model = new ScriptedModel([{ error: 'provider unavailable' }]);
        const result = await planRetrieval(model, 'cheese for a toastie');
        expect(result.fallback).toBe(true);
        expect(result.plan).toMatchObject({ intent: 'discovery', searches: [{ query: 'cheese for a toastie' }] });
    });

    it('gives up after one repair rather than looping', async () => {
        const model = new ScriptedModel([{ json: { intent: 'nope' } }, { json: { still: 'wrong' } }]);
        const result = await planRetrieval(model, 'beans');
        expect(result.fallback).toBe(true);
        expect(result.errors).toHaveLength(2);
    });
});

describe('answer grounding', () => {
    const seenIds = new Set(['05000000000005', '05000000000012']);

    it('passes an answer that only repeats the record', () => {
        const violations = validateAnswer({
            candidate: {
                answer: 'Test Farm Baked Beans (05000000000005) has 4.7 g protein per 100 g.',
                citedProductIds: ['05000000000005'],
                numericClaims: [{ productId: '05000000000005', nutrient: 'proteinG', value: 4.7 }],
            },
            facts: [facts()], seenIds,
        });
        expect(violations).toEqual([]);
    });

    it('rejects a product id no tool returned', () => {
        const violations = validateAnswer({
            candidate: { answer: 'Try 09999999999999.', citedProductIds: ['09999999999999'], numericClaims: [] },
            facts: [facts()], seenIds,
        });
        expect(kinds(violations)).toEqual(['unknown_product_id', 'unknown_product_id']);
    });

    it('rejects a number that contradicts the record, and one with no source at all', () => {
        const wrong = validateAnswer({
            candidate: { answer: 'It has 21 g protein.', citedProductIds: ['05000000000005'], numericClaims: [{ productId: '05000000000005', nutrient: 'proteinG', value: 21 }] },
            facts: [facts()], seenIds,
        });
        expect(kinds(wrong)).toContain('wrong_number');

        const invented = validateAnswer({
            candidate: { answer: 'About 300 kcal per serving.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts()], seenIds,
        });
        expect(kinds(invented)).toEqual(['unverified_number']);
    });

    it('rejects a quoted value for a nutrient the record does not have', () => {
        const noNutrition = facts({ nutrition: null });
        const violations = validateAnswer({
            candidate: { answer: 'It has 5 g fibre.', citedProductIds: ['05000000000005'], numericClaims: [{ productId: '05000000000005', nutrient: 'fibreG', value: 5 }] },
            facts: [noNutrition], seenIds,
        });
        expect(kinds(violations)).toContain('unverified_number');
    });

    it('allows the threshold the system itself applied', () => {
        const violations = validateAnswer({
            candidate: { answer: 'Filtered to at least 20 g protein per 100 g.', citedProductIds: [], numericClaims: [] },
            facts: [facts()], seenIds, allowedNumbers: [20],
        });
        expect(violations).toEqual([]);
    });

    it('rejects a dietary claim the record does not support, and an inference stated as a claim', () => {
        const unsupported = validateAnswer({
            candidate: { answer: 'Test Farm Baked Beans is vegan.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts({ dietary: { claims: [], vegan: 'unknown', vegetarian: 'unknown', basis: 'none', inferredBy: null } })], seenIds,
        });
        expect(kinds(unsupported)).toEqual(['unsupported_dietary']);

        const overstated = validateAnswer({
            candidate: { answer: 'Test Farm Baked Beans is vegan.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts({ dietary: { claims: [], vegan: 'yes', vegetarian: 'yes', basis: 'inferred', inferredBy: 'open_food_facts' } })], seenIds,
        });
        expect(kinds(overstated)).toEqual(['overstated_dietary']);

        const hedged = validateAnswer({
            candidate: { answer: 'Test Farm Baked Beans appears to be vegan, inferred from its ingredients.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts({ dietary: { claims: [], vegan: 'yes', vegetarian: 'yes', basis: 'inferred', inferredBy: 'open_food_facts' } })], seenIds,
        });
        expect(hedged).toEqual([]);
    });

    it('never lets "free from" stand on missing allergen information', () => {
        const violations = validateAnswer({
            candidate: { answer: 'Test Farm Baked Beans is nut-free.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts({ allergens: { status: 'unknown', contains: [], mayContain: [], unrecognised: [] } })], seenIds,
        });
        expect(kinds(violations)).toEqual(['unsupported_allergen']);

        const noneListed = validateAnswer({
            candidate: { answer: 'Test Farm Baked Beans contains no nuts.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [facts({ allergens: { status: 'none_listed', contains: [], mayContain: [], unrecognised: [] } })], seenIds,
        });
        expect(kinds(noneListed)).toEqual(['unsupported_allergen']);
    });

    it('blocks price statements, and allows an honest refusal to give one', () => {
        expect(kinds(validateAnswer({
            candidate: { answer: 'It costs about £1.20 at most supermarkets.', citedProductIds: [], numericClaims: [] },
            facts: [facts()], seenIds,
        }))).toContain('price_claim');

        expect(kinds(validateAnswer({
            candidate: { answer: 'Sainsbury’s is cheapest for this.', citedProductIds: [], numericClaims: [] },
            facts: [facts()], seenIds,
        }))).toEqual(['price_claim']);

        expect(validateAnswer({
            candidate: { answer: 'I do not have current price data, so I cannot say which shop is cheapest.', citedProductIds: [], numericClaims: [] },
            facts: [facts()], seenIds,
        })).toEqual([]);
    });
});

describe('cost accounting', () => {
    it('computes cost from the recorded rate', () => {
        expect(costUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, { inputPerMTok: 1, outputPerMTok: 5, source: 't' })).toBe(6);
    });
});

describe('allergen wording is checked against the declaration, not just its presence', () => {
    const seenIds = new Set(['05000000000005']);
    const peanutty = (): ProductFacts => ({
        productId: '05000000000005', name: 'Injection Foods Beans', brand: 'Injection Foods', quantity: null,
        ingredients: 'Beans, water, peanuts', nutrition: null,
        dietary: { claims: [], vegan: 'unknown', vegetarian: 'unknown', basis: 'none', inferredBy: null },
        allergens: { status: 'listed', contains: ['peanuts'], mayContain: [], unrecognised: [] },
        image: null,
    });

    it('rejects "nut-free" for a product that declares peanuts, even though its allergens are fully listed', () => {
        const violations = validateAnswer({
            candidate: { answer: 'Injection Foods Beans is nut-free.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [peanutty()], seenIds,
        });
        expect(kinds(violations)).toEqual(['unsupported_allergen']);
    });

    it('allows a true statement about a fully declared product', () => {
        const violations = validateAnswer({
            candidate: { answer: 'Injection Foods Beans is gluten-free according to its declaration.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [peanutty()], seenIds,
        });
        expect(violations).toEqual([]);
    });

    it('ignores wording that is not an allergen claim', () => {
        const violations = validateAnswer({
            candidate: { answer: 'This one is sugar-free.', citedProductIds: ['05000000000005'], numericClaims: [] },
            facts: [peanutty()], seenIds,
        });
        expect(violations).toEqual([]);
    });
});

describe('plan scoring', () => {
    it('scores intent, decomposition and each filter group separately', async () => {
        const { scorePlan, aggregatePlanScores } = await import('../../src/assistant/evaluation/planMetrics.js');
        const testCase = {
            id: 'x', category: 'decomposition' as const, query: 'cheese for a toastie', intent: 'ingredient' as const,
            searchMatches: [/cheese/i], searchAvoids: [/toastie/i],
            filters: { minProteinG100: 20, dietary: { vegetarian: true, policy: 'claims_or_inferred' as const } },
        };
        const good = scorePlan(testCase, retrievalPlanSchema.parse({ ...validPlan, intent: 'ingredient' }),
            { minProteinG100: 20, dietary: { vegetarian: true, policy: 'claims_or_inferred' } });
        expect(good).toMatchObject({ intent: true, searchMatched: true, searchAvoided: true, nutrition: true, dietary: true, allergens: true, exact: true });

        const bad = scorePlan(testCase, retrievalPlanSchema.parse({
            intent: 'category', searches: [{ query: 'toastie', purpose: 'p' }], filters: {},
        }), {});
        expect(bad).toMatchObject({ intent: false, searchMatched: false, searchAvoided: false, nutrition: false, dietary: false, exact: false });
        expect(bad.detail.length).toBeGreaterThan(2);

        expect(aggregatePlanScores([good, bad])).toMatchObject({ cases: 2, intent: 0.5, exact: 0.5 });
    });
});
