/**
 * Scoring.
 *
 * The maths used to live inline in two components, which is how the results
 * page and the share text drifted apart: one signed the error, the other did
 * not, so a basket under-guessed by 25% read as -25% on screen and 25% in the
 * text you posted. One module, used by both, cannot disagree with itself.
 */

/** Past this, the game stops counting how wrong you were. */
export const MAX_ERROR = 35;

/** The error buckets behind the emoji grid, in order. */
const SQUARES = [
    { within: 25, square: '🟩' },
    { within: 50, square: '🟨' },
    { within: 75, square: '🟧' },
];
const WORSE = '🟥';

/** Sum the guesses, or the real prices, out of a breakdown. */
export function totalOf(items = [], key) {
    return items.reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0);
}

/**
 * Signed percentage error, clamped to +/-MAX_ERROR.
 *
 * Negative means under-guessed, positive means over-guessed, and zero is the
 * penny-perfect basket the whole game is about.
 */
export function percentageError(guess, correct) {
    if (!Number.isFinite(guess) || !Number.isFinite(correct) || correct === 0) return 0;

    const raw = ((guess - correct) / correct) * 100;
    const clamped = Math.max(Math.min(raw, MAX_ERROR), -MAX_ERROR);
    return parseFloat(clamped.toFixed(2));
}

/** True once the score has hit the wall and stopped counting. */
export function isAtWall(error) {
    return Math.abs(error) >= MAX_ERROR;
}

/**
 * How the error reads on screen. At the wall it gains a "+", because the
 * number no longer means anything precise.
 */
export function formatError(error) {
    const rounded = Number(error).toFixed(0);
    return isAtWall(error) ? `${rounded}%+` : `${rounded}%`;
}

/** The square for one item, by how far off its price the guess was. */
export function squareFor(guess, correct) {
    if (!Number.isFinite(guess) || !Number.isFinite(correct) || correct === 0) return WORSE;

    const off = Math.abs((guess - correct) / correct) * 100;
    return SQUARES.find(bucket => off <= bucket.within)?.square ?? WORSE;
}

/** One square per item, in the order they were guessed. */
export function shareSquares(breakdown = []) {
    return breakdown.map(item => squareFor(Number(item?.guess), Number(item?.correctPrice))).join('');
}

/** Everything the results screen and the share text both need. */
export function scoreBasket(breakdown = []) {
    const guess = totalOf(breakdown, 'guess');
    const correct = totalOf(breakdown, 'correctPrice');
    const error = percentageError(guess, correct);

    return {
        guess,
        correct,
        difference: Math.abs(correct - guess),
        percentageError: error,
        squares: shareSquares(breakdown),
    };
}
