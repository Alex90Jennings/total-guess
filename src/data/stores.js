/**
 * The shops, and their own colours.
 *
 * Shared so the tag above a product and the line in the receipt agree: one
 * place to change a name or a colour, and no chance of the two drifting.
 */
/*
 * `name` is the tag, set the way each brand sets it. `label` is the same shop
 * inside a sentence, where shouting reads badly: "Observed at TESCO on ..." is
 * the tag leaking somewhere it does not belong.
 */
export const STORES = {
    aldi: { name: 'ALDI', label: 'Aldi', colour: '#00205B' },
    asda: { name: 'ASDA', label: 'ASDA', colour: '#78BE20' },
    coop: { name: 'Co-op', label: 'Co-op', colour: '#00B1E7' },
    iceland: { name: 'Iceland', label: 'Iceland', colour: '#D2212E' },
    lidl: { name: 'LIDL', label: 'Lidl', colour: '#0050AA' },
    mands: { name: 'M&S', label: 'M&S', colour: '#1F1F1F' },
    morrisons: { name: 'Morrisons', label: 'Morrisons', colour: '#00563F' },
    sainsburys: { name: "Sainsbury's", label: "Sainsbury's", colour: '#F06C00' },
    tesco: { name: 'TESCO', label: 'Tesco', colour: '#00539F' },
    waitrose: { name: 'Waitrose', label: 'Waitrose', colour: '#5D8A2E' },
};

export const storeFor = (key) =>
    STORES[key] ?? { name: key ?? '', label: key ?? '', colour: 'var(--ink-faint)' };

/** The day a price was seen, as DD/MM/YYYY, or null if it is a representative one. */
function observedDate(item) {
    if (item?.priceKind !== 'observed' || !item?.priceObservedOn) return null;
    return new Date(`${item.priceObservedOn}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    });
}

/**
 * When a price was seen. Beside the shop's name in the receipt, where the
 * shop is already on the line.
 */
export function observedOn(item) {
    const date = observedDate(item);
    return date ? `observed ${date}` : 'representative price';
}

/**
 * The same fact written out, for the play screen, where it stands on its own.
 *
 * These are real prices but not live ones. Saying so while the guess is still
 * being made is the honest place for it: how old a price is changes what it is
 * worth guessing, and a player who only learns the date afterwards has been
 * told too late to use it.
 */
export function provenance(item) {
    const store = storeFor(item?.store).label;
    const date = observedDate(item);
    return date ? `Observed at ${store} on ${date}` : `Representative price for ${store}`;
}
