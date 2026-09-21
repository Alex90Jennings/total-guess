import { nextMidnightUtc } from './TimerToUkMidnight';

const at = (iso) => new Date(iso);

describe('the countdown target', () => {
    test('is the next midnight UTC, not the end of today', () => {
        // 23:59:59 was the old target: a second early, and never actually midnight.
        expect(nextMidnightUtc(at('2026-09-21T10:00:00Z'))).toBe(Date.UTC(2026, 8, 22));
        expect(nextMidnightUtc(at('2026-09-21T23:59:59Z'))).toBe(Date.UTC(2026, 8, 22));
    });

    test('a second past midnight counts to the midnight after it, a full day away', () => {
        // Recomputing this every tick is what rolled 00:00:01 back to 23:59:59.
        const justAfter = at('2026-09-22T00:00:01Z');
        expect(nextMidnightUtc(justAfter) - justAfter.getTime()).toBe(24 * 60 * 60 * 1000 - 1000);
    });

    test('crosses a month and a year boundary', () => {
        expect(nextMidnightUtc(at('2026-09-30T12:00:00Z'))).toBe(Date.UTC(2026, 9, 1));
        expect(nextMidnightUtc(at('2026-12-31T12:00:00Z'))).toBe(Date.UTC(2027, 0, 1));
    });

    test('is a UTC boundary whatever the machine thinks local time is', () => {
        expect(new Date(nextMidnightUtc(at('2026-09-21T23:00:00Z'))).toISOString())
            .toBe('2026-09-22T00:00:00.000Z');
    });
});
