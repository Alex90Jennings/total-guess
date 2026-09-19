import { describe, expect, it } from 'vitest';
import { scaleDecimal } from '../src/normalise/decimal.js';
import { amountToPence, moneyTextToPence } from '../src/normalise/money.js';

describe('amountToPence', () => {
    it('converts pounds exactly, with no float drift', () => {
        expect(0.29 * 100).not.toBe(29); // the bug this avoids
        expect(amountToPence('0.29', 'GBP')).toBe(29);
        expect(amountToPence('6.00', 'GBP')).toBe(600);
        expect(amountToPence('6', 'GBP')).toBe(600);
        expect(amountToPence('32.43', 'GBP')).toBe(3243);
    });

    it('reads GBX amounts as pence, as Morrisons uses them for sub-pound unit prices', () => {
        expect(amountToPence('90.0', 'GBX')).toBe(90);
        expect(amountToPence('83.3', 'GBX')).toBe(83.3);
    });

    it('keeps fractional pence', () => {
        expect(amountToPence('1.135', 'GBP')).toBe(113.5);
    });

    it('rejects anything that is not a plain decimal', () => {
        expect(() => amountToPence('-1.00', 'GBP')).toThrow();
        expect(() => amountToPence('£1.00', 'GBP')).toThrow();
        expect(() => amountToPence('1e3', 'GBP')).toThrow();
    });
});

describe('moneyTextToPence', () => {
    it.each([['£6.50', 650], ['£4', 400], ['£10.5', 1050], ['75p', 75], ['£0.29', 29]])('%s -> %i', (text, pence) => {
        expect(moneyTextToPence(text)).toBe(pence);
    });

    it.each(['6.50', '£', 'p', '£6.505', 'free'])('%s -> null', (text) => {
        expect(moneyTextToPence(text)).toBeNull();
    });
});

describe('scaleDecimal', () => {
    it('shifts the decimal point exactly', () => {
        expect(scaleDecimal('1.1', 3)).toBe(1100);
        expect(scaleDecimal('0.48', 3)).toBe(480);
        expect(scaleDecimal('7', 1)).toBe(70);
        expect(scaleDecimal('83.33', 1)).toBe(833.3);
    });
});
