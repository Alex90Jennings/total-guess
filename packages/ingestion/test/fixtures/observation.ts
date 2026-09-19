import {
    makeQuantity, provenanceFor,
    type NutritionData, type PriceObservation, type ProductRecord,
} from '../../src/contract/index.js';

export const IMPORTED_AT = '2026-09-18T06:41:21Z';

export function validNutrition(overrides: Partial<NutritionData['values']> = {}): NutritionData {
    return {
        per: '100g',
        values: {
            energyKcal: 230, fatG: 0.8, saturatesG: 0.1, carbohydrateG: 46, sugarsG: 1.2,
            fibreG: 2.5, proteinG: 8.5, saltG: 1.0, ...overrides,
        },
        derived: [],
        raw: null,
    };
}

/** A valid record for a fictional product; tests mutate copies of it. */
export function validProductRecord(): ProductRecord {
    return {
        product: {
            barcode: '05000000000005',
            name: 'Test Farm Chopped Tomatoes 4 x 400g',
            brand: 'Test Farm',
            quantity: makeQuantity({ kind: 'mass', perPack: 400, packCount: 4, raw: '4 x 400g' }),
            categories: { canonical: ['en:plant-based-foods', 'en:canned-tomatoes'] },
            description: 'Italian tomatoes.',
            ingredients: 'Tomatoes, Tomato Juice, Celery Salt',
            allergens: { status: 'listed', contains: ['celery'], mayContain: [], unrecognised: [] },
            dietary: { claims: ['vegan'], inferred: { vegan: 'yes', vegetarian: 'yes', by: 'open_food_facts' } },
            nutrition: validNutrition(),
            images: [{
                url: 'https://images.openfoodfacts.org/images/products/500/000/000/0005/front_en.3.400.jpg',
                role: 'front',
                source: 'open_food_facts',
                licence: 'CC-BY-SA',
                attribution: 'Photo: Open Food Facts contributors',
                contributor: null,
                sourcePageUrl: 'https://world.openfoodfacts.org/product/5000000000005',
            }],
        },
        provenance: provenanceFor('open_food_facts', {
            sourceRecordId: '5000000000005',
            sourceUrl: 'https://world.openfoodfacts.org/product/5000000000005',
            importedAt: IMPORTED_AT,
            sourceUpdatedAt: '2026-06-01T10:00:00Z',
        }),
    };
}

export function validPriceObservation(): PriceObservation {
    return {
        productRef: { kind: 'barcode', barcode: '05000000000005' },
        retailer: 'tesco',
        store: {
            retailer: 'tesco', name: 'Tesco Express', sourceStoreId: '42', osm: { type: 'node', id: 123 },
            postcode: 'TE1 1ST', city: 'Testtown', countryCode: 'GB',
        },
        channel: 'in_store',
        offer: { pricePence: 250, priceCondition: 'none', wasPricePence: null, retailerUnitPrice: null, promotions: [], availability: 'unknown' },
        observedOn: '2026-03-14',
        observedAt: null,
        evidence: 'price_tag',
        provenance: provenanceFor('open_prices', {
            sourceRecordId: '1000001',
            sourceUrl: 'https://prices.openfoodfacts.org/prices/1000001',
            importedAt: IMPORTED_AT,
            sourceUpdatedAt: null,
        }),
    };
}
