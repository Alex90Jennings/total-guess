import { describe, expect, it } from 'vitest';
import { ProductRecordSchema } from '../../src/contract/index.js';
import { mapOffProduct } from '../../src/sources/openFoodFacts/mapProduct.js';

const IMPORTED_AT = '2026-09-18T06:41:21Z';

/** Fictional product in the shape of an Open Food Facts v2 product/search result. */
function offProduct(overrides: Record<string, unknown> = {}) {
    return {
        code: '5000000000005',
        product_type: 'food',
        lang: 'en',
        product_name: 'Test Farm Oat Drink',
        brands: 'Test Farm, Test Farm Foods Ltd',
        quantity: '1 L',
        product_quantity: '1000',
        product_quantity_unit: 'ml',
        categories_hierarchy: ['en:plant-based-foods-and-beverages', 'en:beverages', 'en:plant-milks', 'en:oat-milks'],
        ingredients_text: 'Water, Oats (10%), Rapeseed Oil, Salt',
        ingredients_text_en: 'Water, Oats (10%), Rapeseed Oil, Salt',
        allergens_tags: ['en:gluten'],
        traces_tags: ['en:nuts'],
        labels_tags: ['en:vegan', 'en:green-dot'],
        ingredients_analysis_tags: ['en:palm-oil-free', 'en:vegan', 'en:vegetarian'],
        nutriments: {
            'energy-kcal_100g': 46, fat_100g: 1.5, 'saturated-fat_100g': 0.2, carbohydrates_100g: 6.7,
            sugars_100g: 4, fiber_100g: 0.8, proteins_100g: 1, salt_100g: 0.1,
        },
        nutrition_data_per: '100g',
        image_front_url: 'https://images.openfoodfacts.org/images/products/500/000/000/0005/front_en.3.400.jpg',
        image_ingredients_url: 'https://images.openfoodfacts.org/images/products/500/000/000/0005/ingredients_en.5.400.jpg',
        images: { front_en: { imgid: '1' }, 1: { uploader: 'test-photographer' } },
        last_modified_t: 1789000000,
        ...overrides,
    };
}

const map = (overrides: Record<string, unknown> = {}) => {
    const result = mapOffProduct(offProduct(overrides), { importedAt: IMPORTED_AT });
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result;
};

describe('Open Food Facts -> ProductRecord', () => {
    it('maps a product, validated against the contract', () => {
        const { value } = map();
        expect(ProductRecordSchema.safeParse(value).success).toBe(true);
        expect(value.product).toMatchObject({
            barcode: '05000000000005',
            name: 'Test Farm Oat Drink',
            brand: 'Test Farm',
            quantity: { kind: 'volume', total: 1000, raw: '1 L' },
            categories: { canonical: ['en:plant-based-foods-and-beverages', 'en:beverages', 'en:plant-milks', 'en:oat-milks'] },
            ingredients: 'Water, Oats (10%), Rapeseed Oil, Salt',
        });
    });

    it('records provenance: source record, URL, both timestamps, licence', () => {
        expect(map().value.provenance).toMatchObject({
            source: 'open_food_facts',
            sourceRecordId: '5000000000005',
            sourceUrl: 'https://world.openfoodfacts.org/product/5000000000005',
            importedAt: IMPORTED_AT,
            sourceUpdatedAt: '2026-09-10T00:26:40Z',
            licence: expect.stringContaining('ODbL'),
        });
    });

    it('stores nutrition as numbers per 100 ml for drinks', () => {
        expect(map().value.product.nutrition).toEqual({
            per: '100ml',
            values: { energyKcal: 46, fatG: 1.5, saturatesG: 0.2, carbohydrateG: 6.7, sugarsG: 4, fibreG: 0.8, proteinG: 1, saltG: 0.1 },
            derived: [],
            raw: null,
        });
    });

    it('keeps missing nutrients null, and derives kcal from kJ only when kcal is absent', () => {
        const n = map({ nutriments: { 'energy-kj_100g': 418.4, proteins_100g: '3.2' } }).value.product.nutrition!;
        expect(n.values).toMatchObject({ energyKcal: 100, proteinG: 3.2, fatG: null, saltG: null });
        expect(n.derived).toEqual(['energyKcal']);
        expect(map({ nutriments: {} }).value.product.nutrition).toBeNull();
    });

    describe('newer nutrition schema (nutrition.aggregated_set)', () => {
        const aggregated = (nutrients: Record<string, unknown>, per = '100g', preparation = 'as_sold') =>
            ({ nutriments: undefined, nutrition: { aggregated_set: { per, preparation, nutrients } } });

        it('reads declared values, with the basis the source states', () => {
            const n = map(aggregated({
                'energy-kcal': { value: 617, unit: 'kcal', source: 'packaging' }, proteins: { value: 8, unit: 'g' },
                fat: { value: 35, unit: 'g' }, 'saturated-fat': { value: 10, unit: 'g' }, carbohydrates: { value: 57, unit: 'g' },
                sugars: { value: 32, unit: 'g' }, salt: { value: 0.01, unit: 'g', modifier: '~' },
            }, '100ml')).value.product.nutrition!;
            expect(n.per).toBe('100ml');
            expect(n.values).toEqual({ energyKcal: 617, fatG: 35, saturatesG: 10, carbohydrateG: 57, sugarsG: 32, fibreG: null, proteinG: 8, saltG: 0.01 });
        });

        it('treats bounds, estimates and unexpected units as unknown', () => {
            const n = map(aggregated({
                'energy-kcal': { value: 100, unit: 'kcal' }, salt: { value: 0.01, unit: 'g', modifier: '<' },
                fiber: { value: 3, unit: 'g', source: 'estimate' }, proteins: { value: 800, unit: 'mg' },
            })).value.product.nutrition!;
            expect(n.values).toMatchObject({ energyKcal: 100, saltG: null, fibreG: null, proteinG: null });
        });

        it('takes precedence over the older nutriments, and refuses prepared or per-serving sets', () => {
            const both = map({ nutrition: { aggregated_set: { per: '100g', preparation: 'as_sold', nutrients: { proteins: { value: 9, unit: 'g' } } } } });
            expect(both.value.product.nutrition!.values.proteinG).toBe(9);
            const prepared = map(aggregated({ proteins: { value: 9, unit: 'g' } }, '100g', 'prepared'));
            expect(prepared.value.product.nutrition).toBeNull();
            expect(prepared.warnings).toContain('nutrition_not_per_100_as_sold: 100g/prepared');
        });
    });

    it('falls back to categories_tags, keeping only English, lowercase taxonomy ids', () => {
        const categories = map({ categories_hierarchy: undefined, categories_tags: ['en:breakfasts', 'fr:pates-a-tartiner', 'en:null', 'en:Groceries', 'en:spreads'] })
            .value.product.categories.canonical;
        expect(categories).toEqual(['en:breakfasts', 'en:spreads']);
    });

    it('drops per-serving-only and self-contradictory nutrition rather than storing it', () => {
        expect(map({ nutrition_data_per: 'serving' }).value.product.nutrition).toBeNull();
        const bad = map({ nutriments: { fat_100g: 1, 'saturated-fat_100g': 5 } });
        expect(bad.value.product.nutrition).toBeNull();
        expect(bad.warnings.some((w) => w.startsWith('nutrition_inconsistent'))).toBe(true);
    });

    it('separates dietary label claims from ingredient inference', () => {
        expect(map().value.product.dietary).toEqual({
            claims: ['vegan'],
            inferred: { vegan: 'yes', vegetarian: 'yes', by: 'open_food_facts' },
        });
        expect(map({ labels_tags: [], ingredients_analysis_tags: ['en:maybe-vegan', 'en:non-vegetarian'] }).value.product.dietary)
            .toEqual({ claims: [], inferred: { vegan: 'maybe', vegetarian: 'no', by: 'open_food_facts' } });
    });

    it('does not infer anything without ingredients', () => {
        const { dietary, allergens } = map({ ingredients_text: null, ingredients_text_en: null, allergens_tags: [], traces_tags: [] }).value.product;
        expect(dietary.inferred).toEqual({ vegan: 'unknown', vegetarian: 'unknown', by: null });
        expect(allergens.status).toBe('unknown');
    });

    it('separates contains from may-contain', () => {
        expect(map().value.product.allergens).toEqual({ status: 'listed', contains: ['gluten'], mayContain: ['tree_nuts'], unrecognised: [] });
    });

    it('attributes each image, crediting the uploader when OFF names one', () => {
        const [front, ingredients] = map().value.product.images;
        expect(front).toEqual({
            url: 'https://images.openfoodfacts.org/images/products/500/000/000/0005/front_en.3.400.jpg',
            role: 'front', source: 'open_food_facts', licence: 'CC-BY-SA',
            attribution: 'Photo by test-photographer, Open Food Facts', contributor: 'test-photographer',
            sourcePageUrl: 'https://world.openfoodfacts.org/product/5000000000005',
        });
        expect(ingredients).toMatchObject({ role: 'ingredients', contributor: null, attribution: 'Photo: Open Food Facts contributors' });
    });

    it('reads European decimal commas, multipacks, and falls back to the structured quantity', () => {
        expect(map({ quantity: '1,5 L' }).value.product.quantity).toMatchObject({ kind: 'volume', total: 1500, raw: '1,5 L' });
        expect(map({ quantity: '4 x 25 g' }).value.product.quantity).toMatchObject({ kind: 'mass', perPack: 25, packCount: 4, total: 100 });
        expect(map({ quantity: 'approx. 1 litre carton' }).value.product.quantity).toMatchObject({ kind: 'volume', total: 1000 });
    });

    it('does not present non-English ingredients as English', () => {
        const result = map({ lang: 'fr', ingredients_text_en: null, ingredients_text: 'Eau, avoine' });
        expect(result.value.product.ingredients).toBeNull();
        expect(result.warnings).toContain('ingredients_not_in_english');
    });

    it.each<[string, Record<string, unknown>]>([
        ['an invalid barcode', { code: '5000000000001' }],
        ['an in-store barcode', { code: '2012345000001' }],
        ['a non-food product', { product_type: 'petfood' }],
        ['no name', { product_name: '' }],
    ])('rejects %s', (_label, overrides) => {
        expect(mapOffProduct(offProduct(overrides), { importedAt: IMPORTED_AT }).ok).toBe(false);
    });
});
