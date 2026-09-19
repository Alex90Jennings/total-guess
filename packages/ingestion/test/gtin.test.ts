import { describe, expect, it } from 'vitest';
import { canonicalGtin, hasValidCheckDigit, isGs1UkPrefix, isRestrictedCirculation } from '../src/normalise/gtin.js';

describe('GTIN', () => {
    it.each(['5000112637922', '5025125000006', '96385074', '036000291452', '10012345678902'])('%s has a valid check digit', (code) => {
        expect(hasValidCheckDigit(code)).toBe(true);
    });

    it.each(['5000112637923', '123', '50001126379220000', 'abcdefghijklm', ''])('%s is rejected', (code) => {
        expect(canonicalGtin(code)).toBeNull();
    });

    it('pads every length to 14 digits so the same product joins across sources', () => {
        expect(canonicalGtin('5000112637922')).toBe('05000112637922');
        expect(canonicalGtin('05000112637922')).toBe('05000112637922');
        expect(canonicalGtin('036000291452')).toBe('00036000291452');
        expect(canonicalGtin(' 5000112637922 ')).toBe('05000112637922');
    });

    it('recognises in-store and weighed-item codes, which must not be joined on', () => {
        expect(isRestrictedCirculation(canonicalGtin('2012345000001')!)).toBe(true); // EAN-13 20-29
        expect(isRestrictedCirculation(canonicalGtin('5000112637922')!)).toBe(false);
    });

    it('recognises GS1 UK prefixes 500-509', () => {
        expect(isGs1UkPrefix(canonicalGtin('5000112637922')!)).toBe(true);
        expect(isGs1UkPrefix(canonicalGtin('3017620422003')!)).toBe(false); // French prefix
    });
});
