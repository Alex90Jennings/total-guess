import { describe, expect, it } from 'vitest';
import { buildProductDocument, productTextHash } from '../src/documents/productDocument.js';
import { validPriceObservation, validProductRecord } from './fixtures/observation.js';

describe('product semantic document and hash', () => {
    it('builds a readable document with no commercial, store, time or provenance data', () => {
        const document = buildProductDocument(validProductRecord().product);
        expect(document).toBe([
            'Product: Test Farm Chopped Tomatoes 4 x 400g',
            'Brand: Test Farm',
            'Size: 1600 g (4 x 400 g)',
            'Category: plant based foods > canned tomatoes',
            'Dietary: vegan (labelled)', // vegetarian follows from the vegan claim
            'Contains: celery',
            'Nutrition: per 100g: 230 kcal, protein 8.5 g, fat 0.8 g, saturates 0.1 g, carbohydrate 46 g, sugars 1.2 g, fibre 2.5 g, salt 1 g',
            'Description: Italian tomatoes.',
            'Ingredients: Tomatoes, Tomato Juice, Celery Salt',
        ].join('\n'));
        expect(document).not.toMatch(/£|pence|tesco|https?:|2026|open food facts|05000000000005/i);
    });

    it('is unchanged by any price observation for the product', () => {
        const record = validProductRecord();
        const before = productTextHash(record.product);
        const observation = validPriceObservation();
        observation.offer = { ...observation.offer, pricePence: 99, priceCondition: 'loyalty_member', wasPricePence: 250 };
        observation.observedOn = '2026-09-17';
        // Price observations are separate objects: nothing about them is part of the product.
        expect(Object.keys(record.product)).not.toContain('offer');
        expect(productTextHash(record.product)).toBe(before);
    });

    it('ignores provenance, image URLs and the barcode', () => {
        const a = validProductRecord();
        const b = structuredClone(a);
        b.provenance.importedAt = '2027-01-01T00:00:00Z';
        b.provenance.sourceUpdatedAt = '2026-12-31T00:00:00Z';
        b.product.images[0]!.url = 'https://images.openfoodfacts.org/images/products/500/000/000/0005/front_en.9.400.jpg';
        b.product.barcode = '05000112637922';
        expect(productTextHash(b.product)).toBe(productTextHash(a.product));
    });

    it('does not depend on the order of set-like fields', () => {
        const a = validProductRecord().product;
        const b = structuredClone(a);
        a.allergens = { ...a.allergens, contains: ['celery', 'milk'] };
        b.allergens = { ...b.allergens, contains: ['milk', 'celery'] };
        a.dietary = { ...a.dietary, claims: ['vegan', 'gluten_free'] };
        b.dietary = { ...b.dietary, claims: ['gluten_free', 'vegan'] };
        expect(productTextHash(b)).toBe(productTextHash(a));
    });

    it.each<[string, (p: ReturnType<typeof validProductRecord>['product']) => void]>([
        ['name', (p) => { p.name = 'Test Farm Chopped Tomatoes with Basil'; }],
        ['brand', (p) => { p.brand = 'Other Farm'; }],
        ['categories', (p) => { p.categories = { canonical: ['en:tomato-sauces'] }; }],
        ['description', (p) => { p.description = 'Now with basil.'; }],
        ['ingredients', (p) => { p.ingredients = 'Tomatoes, Basil'; }],
        ['dietary claims', (p) => { p.dietary = { ...p.dietary, claims: [] }; }],
        ['may-contain allergens', (p) => { p.allergens = { ...p.allergens, mayContain: ['tree_nuts'] }; }],
        ['nutrition', (p) => { p.nutrition = { ...p.nutrition!, values: { ...p.nutrition!.values, proteinG: 20 } }; }],
    ])('changes when the %s changes', (_field, mutate) => {
        const before = validProductRecord().product;
        const after = structuredClone(before);
        mutate(after);
        expect(productTextHash(after)).not.toBe(productTextHash(before));
    });
});
