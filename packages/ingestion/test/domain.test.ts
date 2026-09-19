import { describe, expect, it } from 'vitest';
import {
    buildAllergenData, canDisplayPublicly, compareNutrient, DATA_SOURCES, describePriceObservation, dietaryMatch,
    hasCompleteLabelNutrition, NO_DIETARY_INFORMATION, NutritionDataSchema, observationAgeDays, provenanceFor,
    ProvenanceSchema, resolveRetailer, retailerName, toAllergen, toBarcode,
    type DietaryData,
} from '../src/contract/index.js';
import { validNutrition, validPriceObservation, validProductRecord } from './fixtures/observation.js';

describe('retailer registry', () => {
    it.each<[string | null, string | null, string | null]>([
        ['Tesco', null, 'tesco'],
        [null, 'Tesco Express', 'tesco'],
        [null, 'Tesco Extra', 'tesco'],
        [null, 'Tesco Superstore', 'tesco'],
        [null, 'Tesco Express Cardiff Road', 'tesco'],
        [null, 'Sainsbury’s Local', 'sainsburys'],
        [null, "Sainsbury's", 'sainsburys'],
        ['Marks & Spencer', 'M&S Simply Food', 'mands'],
        [null, 'Marks and Spencer', 'mands'],
        ['Co-op Food', 'The Co-operative Food', 'coop'],
        [null, 'Iceland', 'iceland'],
        [null, 'Little Waitrose', 'waitrose'],
        [null, 'LIDL', 'lidl'],
        [null, 'Corner Shop & Off Licence', null],
        [null, 'B&M Bargains', null],
        [null, 'Morissons Blue View Primary School', null], // misspelt, and not a shop
        [null, 'Tescopoly Books', null], // never a substring match
        [null, null, null],
    ])('brand %j / name %j -> %j', (brand, name, expected) => {
        expect(resolveRetailer(brand, name)).toBe(expected);
    });

    it('gives display names from the registry', () => {
        expect(retailerName('mands')).toBe('M&S');
        expect(retailerName('sainsburys')).toBe("Sainsbury's");
    });
});

describe('barcodes', () => {
    it('canonicalises valid codes and explains rejections', () => {
        expect(toBarcode('5000112637922')).toEqual({ barcode: '05000112637922' });
        expect(toBarcode('5000112637923')).toMatchObject({ barcode: null, reason: expect.stringContaining('not a valid GTIN') });
        expect(toBarcode('2012345000001')).toMatchObject({ barcode: null, reason: expect.stringContaining('restricted') });
    });
});

describe('allergens: contains vs may contain', () => {
    it('keeps declared allergens and precautionary warnings apart', () => {
        expect(buildAllergenData(['en:milk', 'en:gluten'], ['en:nuts', 'en:sesame-seeds'], true)).toEqual({
            status: 'listed', contains: ['gluten', 'milk'], mayContain: ['sesame', 'tree_nuts'], unrecognised: [],
        });
    });

    it('does not claim a product is allergen-free', () => {
        expect(buildAllergenData([], [], true).status).toBe('none_listed');
        expect(buildAllergenData([], [], false).status).toBe('unknown');
    });

    it('keeps terms outside the UK 14 instead of dropping them', () => {
        expect(buildAllergenData(['en:kiwi'], [], true)).toMatchObject({ status: 'listed', contains: [], unrecognised: ['en:kiwi'] });
    });

    it.each([['en:soybeans', 'soya'], ['Wheat', 'gluten'], ['en:sulphur-dioxide-and-sulphites', 'sulphites'], ['peanuts', 'peanuts'], ['en:kiwi', null]])(
        '%s -> %s', (term, allergen) => expect(toAllergen(term)).toBe(allergen),
    );
});

describe('dietary: claims vs inference', () => {
    const inferredOnly: DietaryData = { claims: [], inferred: { vegan: 'yes', vegetarian: 'yes', by: 'open_food_facts' } };
    const claimed: DietaryData = { claims: ['vegan'], inferred: { vegan: 'unknown', vegetarian: 'unknown', by: null } };
    const conflicting: DietaryData = { claims: ['vegetarian'], inferred: { vegan: 'no', vegetarian: 'no', by: 'open_food_facts' } };

    it('a strict query only accepts explicit claims', () => {
        expect(dietaryMatch(inferredOnly, 'vegan', 'claims_only')).toBe('unknown');
        expect(dietaryMatch(claimed, 'vegan', 'claims_only')).toBe('yes');
    });

    it('a looser query also accepts inference, and says no only on evidence', () => {
        expect(dietaryMatch(inferredOnly, 'vegan', 'claims_or_inferred')).toBe('yes');
        expect(dietaryMatch({ ...inferredOnly, inferred: { ...inferredOnly.inferred, vegan: 'maybe' } }, 'vegan', 'claims_or_inferred')).toBe('unknown');
        expect(dietaryMatch(NO_DIETARY_INFORMATION, 'vegetarian', 'claims_or_inferred')).toBe('unknown');
    });

    it('a vegan claim satisfies vegetarian', () => {
        expect(dietaryMatch(claimed, 'vegetarian', 'claims_only')).toBe('yes');
    });

    it('gluten-free is never inferred', () => {
        expect(dietaryMatch(inferredOnly, 'gluten_free', 'claims_or_inferred')).toBe('unknown');
    });

    it('keeps a claim that the ingredient analysis disagrees with, and the claim wins', () => {
        expect(conflicting.claims).toContain('vegetarian');
        expect(conflicting.inferred.vegetarian).toBe('no');
        expect(dietaryMatch(conflicting, 'vegetarian', 'claims_or_inferred')).toBe('yes');
    });
});

describe('numeric nutrition', () => {
    const nutrition = validNutrition({ proteinG: 21, energyKcal: 280, saltG: 0.4 });

    it('supports deterministic threshold queries', () => {
        expect(compareNutrient(nutrition, 'proteinG', '>=', 20)).toBe(true);
        expect(compareNutrient(nutrition, 'energyKcal', '<=', 300)).toBe(true);
        expect(compareNutrient(nutrition, 'saltG', '<=', 0.3)).toBe(false);
    });

    it('treats a missing value as unknown, never as a pass or as zero', () => {
        const missing = validNutrition({ proteinG: null });
        expect(compareNutrient(missing, 'proteinG', '>=', 20)).toBeNull();
        expect(compareNutrient(missing, 'proteinG', '<=', 20)).toBeNull();
        expect(compareNutrient(null, 'saltG', '<=', 1)).toBeNull();
        expect(hasCompleteLabelNutrition(missing)).toBe(false);
        expect(hasCompleteLabelNutrition(nutrition)).toBe(true);
    });

    it('fibre is not required for a complete UK label', () => {
        expect(hasCompleteLabelNutrition(validNutrition({ fibreG: null }))).toBe(true);
    });

    it.each<[string, Parameters<typeof validNutrition>[0]]>([
        ['negative values', { saltG: -1 }],
        ['saturates above fat', { fatG: 1, saturatesG: 2 }],
        ['sugars above carbohydrate', { carbohydrateG: 5, sugarsG: 6 }],
    ])('rejects %s', (_label, overrides) => {
        expect(NutritionDataSchema.safeParse(validNutrition(overrides)).success).toBe(false);
    });

    it('rejects a derived value that is missing', () => {
        expect(NutritionDataSchema.safeParse({ ...validNutrition({ energyKcal: null }), derived: ['energyKcal'] }).success).toBe(false);
    });
});

describe('provenance', () => {
    it('takes licence and attribution from the source registry', () => {
        const p = provenanceFor('open_prices', { sourceRecordId: '1', sourceUrl: null, importedAt: '2026-09-18T06:00:00Z', sourceUpdatedAt: null });
        expect(p).toMatchObject({ source: 'open_prices', licence: 'ODbL-1.0', attribution: DATA_SOURCES.open_prices.attribution });
        expect(ProvenanceSchema.safeParse(p).success).toBe(true);
    });

    it('records Morrisons as a known but disabled source with no licence', () => {
        expect(DATA_SOURCES.morrisons).toMatchObject({ status: 'disabled', licence: null });
        expect(provenanceFor('morrisons', { sourceRecordId: '1', sourceUrl: null, importedAt: '2026-09-18T06:00:00Z', sourceUpdatedAt: null }).licence).toBeNull();
    });

    it('answers "where did this value come from?" for a product record', () => {
        const { provenance } = validProductRecord();
        expect(provenance).toEqual({
            source: 'open_food_facts',
            sourceRecordId: '5000000000005',
            sourceUrl: 'https://world.openfoodfacts.org/product/5000000000005',
            importedAt: '2026-09-18T06:41:21Z',
            sourceUpdatedAt: '2026-06-01T10:00:00Z',
            licence: DATA_SOURCES.open_food_facts.licence,
            attribution: DATA_SOURCES.open_food_facts.attribution,
        });
    });
});

describe('image attribution', () => {
    it('only licensed, attributed images may be shown publicly', () => {
        const image = validProductRecord().product.images[0]!;
        expect(canDisplayPublicly(image)).toBe(true);
        expect(canDisplayPublicly({ ...image, source: 'morrisons', licence: null, attribution: null })).toBe(false);
    });
});

describe('historical price semantics', () => {
    it('describes an observation with its place and date, never as a current price', () => {
        const text = describePriceObservation(validPriceObservation());
        expect(text).toBe('£2.50 — observed at Tesco on 14 March 2026');
        expect(text).not.toMatch(/current|now|today|Tesco price/i);
    });

    it('marks loyalty and unexplained discounts', () => {
        const o = validPriceObservation();
        expect(describePriceObservation({ ...o, offer: { ...o.offer, priceCondition: 'loyalty_member' } }))
            .toBe('£2.50 with a loyalty card — observed at Tesco on 14 March 2026');
        expect(describePriceObservation({ ...o, offer: { ...o.offer, pricePence: 75, priceCondition: 'unknown' } }))
            .toBe('75p (discounted; terms not recorded) — observed at Tesco on 14 March 2026');
    });

    it('names an independent shop by its own name', () => {
        const o = validPriceObservation();
        expect(describePriceObservation({ ...o, retailer: null, store: { ...o.store!, retailer: null, name: 'Corner Shop' } }))
            .toBe('£2.50 — observed at Corner Shop on 14 March 2026');
    });

    it('keeps the observation date apart from the import time', () => {
        const o = validPriceObservation();
        expect(o.observedOn).toBe('2026-03-14');
        expect(o.provenance.importedAt).toBe('2026-09-18T06:41:21Z');
        expect(observationAgeDays(o, '2026-09-18')).toBe(188);
    });
});
