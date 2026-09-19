/**
 * The shops, and their own colours.
 *
 * Shared so the tag above a product and the line in the receipt agree: one
 * place to change a name or a colour, and no chance of the two drifting.
 */
export const STORES = {
    aldi: { name: 'ALDI', colour: '#00205B' },
    asda: { name: 'ASDA', colour: '#78BE20' },
    coop: { name: 'Co-op', colour: '#00B1E7' },
    iceland: { name: 'Iceland', colour: '#D2212E' },
    lidl: { name: 'LIDL', colour: '#0050AA' },
    mands: { name: 'M&S', colour: '#1F1F1F' },
    morrisons: { name: 'Morrisons', colour: '#00563F' },
    sainsburys: { name: "Sainsbury's", colour: '#F06C00' },
    tesco: { name: 'TESCO', colour: '#00539F' },
    waitrose: { name: 'Waitrose', colour: '#5D8A2E' },
};

export const storeFor = (key) => STORES[key] ?? { name: key ?? '', colour: 'var(--ink-faint)' };

/**
 * When a price was seen, and where. Shown only after the answer is revealed:
 * these are real prices but not live ones, and must not read as today's.
 */
export function observedOn(item) {
    if (item?.priceKind !== 'observed' || !item?.priceObservedOn) return 'representative price';
    const date = new Date(`${item.priceObservedOn}T00:00:00Z`);
    return `observed ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
}
