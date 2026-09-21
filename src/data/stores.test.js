import { observedOn, provenance, storeFor } from './stores';

const seen = { store: 'sainsburys', priceKind: 'observed', priceObservedOn: '2024-11-02' };
const representative = { store: 'tesco', priceKind: 'representative', priceObservedOn: null };

describe('where and when a price was seen', () => {
    test('the receipt line leaves the shop to the tag beside it', () => {
        expect(observedOn(seen)).toBe('observed 02/11/2024');
        expect(observedOn(representative)).toBe('representative price');
    });

    test('the play line stands on its own, so it names the shop', () => {
        expect(provenance(seen)).toBe("Observed at Sainsbury's on 02/11/2024");
        expect(provenance(representative)).toBe('Representative price for Tesco');
    });

    test('the date is the day it was observed in UTC, not the local one', () => {
        // A local timezone west of UTC would otherwise report the day before.
        expect(provenance({ ...seen, priceObservedOn: '2025-01-01' }))
            .toBe("Observed at Sainsbury's on 01/01/2025");
    });

    test('an unknown shop still reads as a shop', () => {
        expect(storeFor('nowhere').name).toBe('nowhere');
        expect(provenance({ store: 'nowhere' })).toBe('Representative price for nowhere');
    });

    test('the tag keeps the brand\'s own capitals, the sentence does not', () => {
        expect(storeFor('tesco').name).toBe('TESCO');
        expect(storeFor('tesco').label).toBe('Tesco');
    });
});
