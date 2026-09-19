/**
 * Fictional products in the shape of Open Food Facts nightly-dump records
 * (images.selected / images.uploaded, not the API's image_front_url).
 */
import { Readable } from 'node:stream';

type Json = Record<string, unknown>;

const NUTRIMENTS = {
    'energy-kcal_100g': 78, 'energy-kj_100g': 330, fat_100g: 0.3, 'saturated-fat_100g': 0.1, carbohydrates_100g: 12.5,
    sugars_100g: 4.1, fiber_100g: 3.7, proteins_100g: 4.7, salt_100g: 0.6, 'vitamin-c_100g': 0.001,
};

export function offDumpRecord(overrides: Json = {}): Json {
    return {
        code: '5000000000005',
        product_type: 'food',
        lang: 'en',
        product_name: 'Test Farm Baked Beans in Tomato Sauce',
        product_name_en: 'Test Farm Baked Beans in Tomato Sauce',
        product_name_fr: 'Haricots',
        generic_name_en: 'Haricot beans in a rich tomato sauce',
        brands: 'Test Farm',
        quantity: '415 g',
        product_quantity: 415,
        product_quantity_unit: 'g',
        categories_hierarchy: ['en:plant-based-foods-and-beverages', 'en:plant-based-foods', 'en:legumes', 'en:baked-beans'],
        ingredients_text: 'Beans (51%), Tomatoes (34%), Water, Sugar, Salt',
        ingredients_text_en: 'Beans (51%), Tomatoes (34%), Water, Sugar, Salt',
        ingredients_text_fr: 'Haricots, tomates',
        allergens_tags: [],
        traces_tags: [],
        labels_tags: ['en:vegetarian', 'en:vegan'],
        ingredients_analysis_tags: ['en:palm-oil-free', 'en:vegan', 'en:vegetarian'],
        nutriments: NUTRIMENTS,
        nutrition_data_per: '100g',
        images: {
            selected: {
                front: { en: { imgid: '1', rev: '7', sizes: { 400: { w: 300, h: 400 } } } },
                ingredients: { en: { imgid: '2', rev: '9', sizes: {} } },
            },
            uploaded: { 1: { uploader: 'test-photographer', uploaded_t: 1 }, 2: { uploader: 'another-photographer' } },
        },
        countries_tags: ['en:united-kingdom'],
        stores_tags: ['tesco'],
        data_quality_errors_tags: [],
        last_modified_t: 1789000000,
        unique_scans_n: 120,
        completeness: 0.9,
        ecoscore_data: { big: 'irrelevant' },
        ...overrides,
    };
}

/** A small dump covering every gate and tier. */
export function offDumpFixture(): Json[] {
    const high = (code: string, name: string, extra: Json = {}) =>
        offDumpRecord({ code, product_name: name, product_name_en: name, ...extra });
    return [
        offDumpRecord(),                                                                       // Tier A
        high('5000000000012', 'Test Farm Greek Style Yoghurt', {
            categories_hierarchy: ['en:dairies', 'en:fermented-foods', 'en:yogurts', 'en:greek-style-yogurts'],
            ingredients_text_en: 'Yoghurt (Milk)', allergens_tags: ['en:milk'], labels_tags: ['en:vegetarian'],
            ingredients_analysis_tags: ['en:non-vegan', 'en:vegetarian'],
            nutriments: { ...NUTRIMENTS, 'energy-kcal_100g': 97, proteins_100g: 9.0, fat_100g: 5, 'saturated-fat_100g': 3.4 },
            unique_scans_n: 300,
        }),                                                                                    // Tier A
        high('5000000000029', 'Test Farm Chicken Breast Fillets', {
            categories_hierarchy: ['en:meats', 'en:poultries', 'en:chickens', 'en:chicken-breasts'],
            ingredients_text_en: 'Chicken Breast (100%)', labels_tags: [], ingredients_analysis_tags: ['en:non-vegan', 'en:non-vegetarian'],
            nutriments: { 'energy-kcal_100g': 106, fat_100g: 1.1, 'saturated-fat_100g': 0.3, carbohydrates_100g: 0, sugars_100g: 0, proteins_100g: 24, salt_100g: 0.14 },
        }),                                                                                    // Tier A, high protein
        high('5000000000036', 'Test Farm Dark Chocolate 70%', {
            categories_hierarchy: ['en:snacks', 'en:sweet-snacks', 'en:chocolates', 'en:dark-chocolates'],
            ingredients_text_en: 'Cocoa Mass, Sugar, Cocoa Butter. May contain milk.', traces_tags: ['en:milk', 'en:nuts'],
            nutriments: { 'energy-kcal_100g': 580 }, // incomplete nutrition
        }),                                                                                    // Tier B
        high('5000000000043', 'Test Farm Peanut Butter', { images: undefined }),               // Tier C: no image
        offDumpRecord({ code: '5000000000050', lang: 'fr', product_name: 'Rillettes', product_name_en: undefined, ingredients_text_en: undefined }), // Tier C
        offDumpRecord({ code: '5000000000067', product_type: 'petfood', product_name_en: 'Test Dog Biscuits' }), // gate: not food
        offDumpRecord({ code: '5000000000074', obsolete: true }),                              // gate: obsolete
        offDumpRecord({ code: '5000000000001' }),                                              // gate: invalid GTIN
        offDumpRecord({ code: '2012345000001' }),                                              // gate: restricted
        offDumpRecord({ code: '5000000000081', product_name: '', product_name_en: '' }),       // mapper rejects: no name
        offDumpRecord({ code: '05000000000005', unique_scans_n: 1 }),                          // duplicate GTIN of the first
        offDumpRecord({ code: '5000000000098', countries_tags: ['en:france'] }),               // not UK: dropped at extraction
    ];
}

export function asJsonLines(records: Json[]): Readable {
    return Readable.from([records.map((r) => JSON.stringify(r)).join('\n') + '\n']);
}
