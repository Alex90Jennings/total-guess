import {
    MAX_ERROR,
    formatError,
    isAtWall,
    percentageError,
    scoreBasket,
    shareSquares,
    squareFor,
    totalOf,
} from './scoring';

const basket = (...pairs) => pairs.map(([guess, correctPrice]) => ({ guess, correctPrice }));

describe('percentageError', () => {
    test('a penny-perfect basket scores zero', () => {
        expect(percentageError(20, 20)).toBe(0);
    });

    test('under-guessing is negative, over-guessing is positive', () => {
        expect(percentageError(15, 20)).toBe(-25);
        expect(percentageError(25, 20)).toBe(25);
    });

    test('clamps to the wall in both directions', () => {
        expect(percentageError(1, 100)).toBe(-MAX_ERROR);
        expect(percentageError(1000, 100)).toBe(MAX_ERROR);
    });

    test('a basket valued at fourteen pounds of pasta still only scores 35', () => {
        expect(percentageError(200, 20)).toBe(MAX_ERROR);
    });

    test('rounds to two decimals rather than carrying float noise', () => {
        expect(percentageError(29, 30)).toBe(-3.33);
        expect(percentageError(30.1, 30)).toBe(0.33);
    });

    test('survives the inputs a broken game could hand it', () => {
        expect(percentageError(10, 0)).toBe(0);
        expect(percentageError(NaN, 20)).toBe(0);
        expect(percentageError(undefined, 20)).toBe(0);
    });
});

describe('the wall', () => {
    test('recognises a score that has stopped counting', () => {
        expect(isAtWall(MAX_ERROR)).toBe(true);
        expect(isAtWall(-MAX_ERROR)).toBe(true);
        expect(isAtWall(34.99)).toBe(false);
    });

    test('formats a walled score with a plus and a normal one without', () => {
        expect(formatError(MAX_ERROR)).toBe('35%+');
        expect(formatError(-MAX_ERROR)).toBe('-35%+');
        expect(formatError(-12)).toBe('-12%');
        expect(formatError(0)).toBe('0%');
    });
});

describe('share squares', () => {
    test('each bucket gets its colour', () => {
        expect(squareFor(10, 10)).toBe('🟩');       // spot on
        expect(squareFor(12.5, 10)).toBe('🟩');     // 25%, on the boundary
        expect(squareFor(15, 10)).toBe('🟨');       // 50%
        expect(squareFor(17.5, 10)).toBe('🟧');     // 75%
        expect(squareFor(30, 10)).toBe('🟥');       // beyond
    });

    test('being under by the same margin scores the same as being over', () => {
        expect(squareFor(7.5, 10)).toBe(squareFor(12.5, 10));
    });

    test('one square per item, in the order guessed', () => {
        const squares = shareSquares(basket([10, 10], [15, 10], [30, 10]));
        expect(squares).toBe('🟩🟨🟥');
        expect([...squares]).toHaveLength(3);
    });

    test('a free item cannot be guessed proportionally, so it is never green', () => {
        expect(squareFor(1, 0)).toBe('🟥');
    });
});

describe('scoreBasket', () => {
    const ten = basket(
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
        [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    );

    test('a perfect ten-item basket', () => {
        const result = scoreBasket(ten);
        expect(result.guess).toBe(30);
        expect(result.correct).toBe(30);
        expect(result.difference).toBe(0);
        expect(result.percentageError).toBe(0);
        expect(result.squares).toBe('🟩'.repeat(10));
    });

    test('difference is always positive, error carries the sign', () => {
        const low = scoreBasket(basket([5, 10], [5, 10]));
        expect(low.difference).toBe(10);
        expect(low.percentageError).toBe(-MAX_ERROR);
    });

    test('an empty basket does not divide by zero', () => {
        const result = scoreBasket([]);
        expect(result.percentageError).toBe(0);
        expect(result.squares).toBe('');
    });

    // The bug this module exists to prevent: the results screen showed -25%
    // while the share text you posted said 25.
    test('the share text and the results screen agree on the sign', () => {
        const under = basket([7, 10], [7, 10]);
        const fromBasket = scoreBasket(under).percentageError;
        const direct = percentageError(totalOf(under, 'guess'), totalOf(under, 'correctPrice'));
        expect(fromBasket).toBe(direct);
        expect(fromBasket).toBeLessThan(0);
    });
});

describe('totalOf', () => {
    test('adds a column of the breakdown', () => {
        expect(totalOf(basket([1.5, 2], [2.5, 3]), 'guess')).toBe(4);
        expect(totalOf(basket([1.5, 2], [2.5, 3]), 'correctPrice')).toBe(5);
    });

    test('treats missing and unparseable values as zero', () => {
        expect(totalOf([{ guess: 5 }, {}, { guess: 'x' }, null], 'guess')).toBe(5);
    });
});
