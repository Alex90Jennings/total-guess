import { describe, expect, it } from 'vitest';
import { PromotionSchema } from '../../src/contract/promotion.js';
import { classifyPromotion, endsOnFromText, type PriceContext } from '../../src/adapters/morrisons/promotions.js';

const classify = (text: string, prices: PriceContext, extra: Partial<{ id: string | null; longText: string; requiredQuantity: number }> = {}) => {
    const warnings: string[] = [];
    const promotion = classifyPromotion({
        retailerPromotionId: extra.id === undefined ? '1000000001' : extra.id,
        text,
        longText: extra.longText ?? null,
        requiredQuantity: extra.requiredQuantity ?? null,
    }, prices, warnings);
    expect(PromotionSchema.safeParse(promotion).success).toBe(true);
    return { promotion, warnings };
};

const at = (currentPence: number, originalPence: number | null = null): PriceContext => ({ currentPence, originalPence });

describe('Morrisons promotions seen in real listings', () => {
    it('Buy N for £X -> multibuy', () => {
        expect(classify('Buy 2 for £10', at(600)).promotion).toEqual({
            type: 'multibuy', retailerPromotionId: '1000000001', text: 'Buy 2 for £10', endsOn: null,
            quantity: 2, pricePence: 1000,
        });
    });

    it('keeps a group multibuy even when this product alone is cheaper than the deal', () => {
        // One "Buy 2 for £4" id can span products priced £2.25 and £1.50; the deal is judged per basket, not per product.
        expect(classify('Buy 2 for £4', at(150)).promotion).toMatchObject({ type: 'multibuy', quantity: 2, pricePence: 400 });
    });

    it('Mix & Match - Any N for £X -> multibuy (scope comes from the promotion id, as for every multibuy)', () => {
        expect(classify('Mix & Match - Any 3 for £5', at(200)).promotion)
            .toMatchObject({ type: 'multibuy', quantity: 3, pricePence: 500 });
    });

    it.each([
        ['Now £4, Was £6.50', at(400, 650), 400, 650],
        ['Now 75p, Was £1.30', at(75, 130), 75, 130],
        ['Half price, was £5', at(250, 500), 250, 500],
        ['Save 1/3, was £10.50', at(700, 1050), 700, 1050],
        ['Save 1/3, was £7.50', at(500, 750), 500, 750],
    ])('%s -> price_reduction, already in the shelf price', (text, prices, pricePence, wasPricePence) => {
        expect(classify(text, prices).promotion).toMatchObject({ type: 'price_reduction', pricePence, wasPricePence });
    });

    it('£X - More Card Price -> loyalty_price', () => {
        expect(classify('£2.50 - More Card Price', at(325)).promotion)
            .toMatchObject({ type: 'loyalty_price', scheme: 'more_card', pricePence: 250 });
    });

    it.each(['Unbeatable Price', 'Food To Go Meal Deal for £5', 'Italian Meal Deal for £10',
        'Shredded Wheat Breakfast Bundle for £4', 'Chicken Caesar Salad Bundle for £6'])(
        '%s -> unparsed, text kept, warning raised',
        (text) => {
            const { promotion, warnings } = classify(text, at(100));
            expect(promotion).toEqual({ type: 'unparsed', retailerPromotionId: '1000000001', text, endsOn: null, sourceCode: null });
            expect(warnings).toHaveLength(1);
        },
    );
});

describe('promotions are only given a mechanic when the numbers agree with the page', () => {
    it.each<[string, string, PriceContext, Partial<{ id: string | null; requiredQuantity: number }>]>([
        ['now-price differs from the shelf price', 'Now £4, Was £6.50', at(450, 650), {}],
        ['was-price differs from the structured was-price', 'Now £4, Was £6.50', at(400, 700), {}],
        ['half price that is not half', 'Half price, was £5', at(300, 500), {}],
        ['a fraction saving that does not add up', 'Save 1/3, was £10.50', at(800, 1050), {}],
        ['a multibuy with no promotion id', 'Buy 2 for £10', at(600), { id: null }],
        ['a multibuy whose text and quantity field disagree', 'Buy 2 for £10', at(600), { requiredQuantity: 3 }],
        ['a loyalty price above the shelf price', '£4 - More Card Price', at(325), {}],
    ])('%s -> unparsed', (_label, text, prices, extra) => {
        expect(classify(text, prices, extra).promotion.type).toBe('unparsed');
    });
});

describe('endsOnFromText', () => {
    it('reads the order-by date from the long description', () => {
        expect(endsOnFromText('Buy 2 for £10. Order by 22/09/2026, offer subject to availability.')).toBe('2026-09-22');
    });

    it('ignores impossible dates and missing text', () => {
        expect(endsOnFromText('Order by 31/02/2026')).toBeNull();
        expect(endsOnFromText('Buy 2 for £10')).toBeNull();
        expect(endsOnFromText(null)).toBeNull();
    });

    it('carries through to the promotion', () => {
        const { promotion } = classify('Buy 2 for £10', at(600), { longText: 'Buy 2 for £10. Order by 22/09/2026.' });
        expect(promotion.endsOn).toBe('2026-09-22');
    });
});
