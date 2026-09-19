/**
 * Synthetic Morrisons pages. The structure (script tags, data-test hooks,
 * window.__X__ assignments, field names) mirrors pages captured on
 * 2026-09-18; the products are fictional. Real captures are Morrisons data
 * and are never committed (see README).
 */

export const PRODUCT_URL = 'https://groceries.morrisons.com/products/test-farm-chopped-tomatoes-4-x-400g/900000001';
export const LISTING_URL = 'https://groceries.morrisons.com/categories/food-cupboard/tins-cans-packets/tomatoes/900';
export const OBSERVED_AT = '2026-09-18T06:41:21Z';

const money = (amount: string, currency: 'GBP' | 'GBX' = 'GBP') => ({ amount, currency });

export function foodProduct(overrides: Record<string, unknown> = {}) {
    return {
        productId: '00000000-0000-4000-8000-000000000001',
        retailerProductId: '900000001',
        type: 'REGULAR',
        name: 'Test Farm Chopped Tomatoes 4 x 400g ',
        brand: 'Test Farm',
        packSizeDescription: '4 x 400g',
        price: money('1.80'),
        unitPrice: { price: money('1.13'), unit: 'fop.price.per.kg' },
        available: true,
        promotions: [{
            promoId: 'p-1', retailerPromotionId: '1000000001', description: 'Buy 2 for £3',
            type: 'OFFER', presentationMode: 'DEFAULT', requiredProductQuantity: 2, limitReached: false,
        }],
        image: { src: 'https://groceries.morrisons.com/images-v3/x/y/300x300.jpg' },
        iconAttributes: [],
        categoryPath: ['Food Cupboard', 'Tins, Cans & Packets ', 'Tomatoes ', 'Chopped Tomatoes'],
        ...overrides,
    };
}

export function foodBopData(overrides: Record<string, unknown> = {}) {
    return {
        detailedDescription: 'Italian tomatoes, chopped &amp; packed in juice.',
        fields: [
            { title: 'brand', content: 'Test Farm' },
            { title: 'ingredients', content: 'Tomatoes (65%), Tomato Juice, <b>Celery</b> Salt, Acidity Regulator: Citric Acid' },
            {
                title: 'nutritionalData',
                content: '<table class="nutrition"><tbody><tr><th>Typical Values</th><th>Per 100g</th></tr>'
                    + '<tr><td>Energy</td><td>92kJ/22kcal</td></tr><tr><td>Protein</td><td>1.2g</td></tr></tbody></table>',
            },
        ],
        breadcrumbs: [],
        ...overrides,
    };
}

export function foodBopPromotions() {
    return [{
        promoId: 'p-1', retailerPromotionId: '1000000001', description: 'Buy 2 for £3',
        longDescription: 'Buy 2 for £3. Order by 30/09/2026, offer subject to availability.',
        type: 'OFFER', presentationMode: 'DEFAULT', limitReached: false, isMultiBuy: true,
    }];
}

export function foodJsonLd(overrides: Record<string, unknown> = {}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        sku: '900000001',
        name: 'Test Farm Chopped Tomatoes 4 x 400g ',
        description: 'Italian tomatoes, chopped & packed in juice.',
        image: ['https://groceries.morrisons.com/images-v3/x/y/500x500.jpg'],
        brand: 'Test Farm',
        size: '4 x 400g',
        offers: { '@type': 'Offer', price: '1.80', priceCurrency: 'GBP', availability: 'https://schema.org/InStock' },
        ...overrides,
    };
}

export function productPageHtml(parts: {
    product?: unknown;
    bopData?: unknown;
    bopPromotions?: unknown;
    jsonLd?: unknown | null;
    omitQueryState?: boolean;
} = {}): string {
    const data = {
        product: parts.product ?? foodProduct(),
        bopData: parts.bopData ?? foodBopData(),
        bopPromotions: parts.bopPromotions ?? foodBopPromotions(),
        detailedImages: [],
    };
    const query = {
        mutations: [],
        queries: [{ dehydratedAt: 1789710782067, state: { data, status: 'success' }, queryKey: ['bop', '900000001'], queryHash: '["bop","900000001"]' }],
    };
    const jsonLd = parts.jsonLd === undefined ? foodJsonLd() : parts.jsonLd;
    return [
        '<!doctype html><html><head>',
        jsonLd === null ? '' : `<script data-rh="true" data-test="product-details-structured-data" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
        '</head><body><div id="root"></div>',
        '<script data-test="initial-state-script" nonce="n">window.__INITIAL_STATE__={"themeMode":"system","data":{}}</script>',
        parts.omitQueryState ? '' : `<script data-test="query-initial-state" nonce="n">window.__QUERY_INITIAL_STATE__=${JSON.stringify(query)}</script>`,
        '</body></html>',
    ].join('\n');
}

export function listingEntity(overrides: Record<string, unknown> = {}) {
    return {
        productId: '00000000-0000-4000-8000-000000000002',
        retailerProductId: '900000002',
        brand: 'Test Farm',
        available: true,
        name: 'Test Farm Passata (500g)',
        price: { current: money('0.55'), unit: { label: 'fop.price.per.kg', current: money('110.0', 'GBX') } },
        size: { value: '500g' },
        offers: null,
        attributes: [{ icon: 'vegetarian', label: 'Vegetarian' }, { icon: 'vegan', label: 'Vegan' }, { icon: 'organic', label: 'Organic' }],
        image: { src: 'https://groceries.morrisons.com/images-v3/x/z/300x300.jpg' },
        categoryPath: ['Food Cupboard', 'Tins, Cans & Packets', 'Tomatoes', 'Passata'],
        ...overrides,
    };
}

export function listingPageHtml(entities: Record<string, unknown>[], linkedSkus?: string[]): string {
    const productEntities = Object.fromEntries(entities.map((e, i) => [`id-${i}`, e]));
    const links = (linkedSkus ?? entities.map((e) => String(e.retailerProductId)))
        .map((sku) => `<a href="/products/test-product/${sku}">x</a>`).join('');
    const state = { themeMode: 'system', data: { products: { productEntities } } };
    return `<!doctype html><html><body>${links}<script data-test="initial-state-script" nonce="n">window.__INITIAL_STATE__=${JSON.stringify(state)}</script></body></html>`;
}
