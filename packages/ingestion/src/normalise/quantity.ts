/**
 * Pack-size strings to ProductQuantity. Accepts only shapes it can read with
 * certainty and returns null for anything else: a missing quantity is honest,
 * a guessed one corrupts every unit price and basket built on it.
 *
 *   400g, 1.2kg, 500ml, 2L, 70cl       single pack
 *   2 pints, 4 pint                    UK pints (exactly 568.26125 ml)
 *   4 x 400g, 6x330ml                  multipack
 *   6 per pack, 4 pack, 12 pk          count
 */
import { makeQuantity, type ProductQuantity, type WeightRange } from '../contract/quantity.js';
import { scaleDecimal } from './decimal.js';

type Unit = { kind: 'mass' | 'volume'; power: number };

const UNITS: Record<string, Unit> = {
    g: { kind: 'mass', power: 0 },
    kg: { kind: 'mass', power: 3 },
    ml: { kind: 'volume', power: 0 },
    cl: { kind: 'volume', power: 1 },
    l: { kind: 'volume', power: 3 },
    ltr: { kind: 'volume', power: 3 },
    litre: { kind: 'volume', power: 3 },
    litres: { kind: 'volume', power: 3 },
};

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(kg|g|ml|cl|litres|litre|ltr|l)`;
const SINGLE = new RegExp(String.raw`^${NUMBER}\s*${UNIT}$`, 'i');
const MULTI = new RegExp(String.raw`^(\d+)\s*[x×]\s*${NUMBER}\s*${UNIT}$`, 'i');
const COUNT = /^(\d+)\s*(?:per pack|pack|pk)$/i;
const PINTS = /^(\d+(?:\.\d+)?)\s*(?:pints?|pt)$/i;
/** The UK (imperial) pint, by definition. */
export const ML_PER_UK_PINT = 568.26125;

function measured(raw: string, count: number, amount: string, unitText: string): ProductQuantity | null {
    const unit = UNITS[unitText.toLowerCase()];
    if (!unit) return null;
    const perPack = scaleDecimal(amount, unit.power);
    if (perPack <= 0 || count <= 0) return null;
    return makeQuantity({ kind: unit.kind, perPack, packCount: count, raw });
}

export function parseQuantity(rawInput: string): ProductQuantity | null {
    const raw = rawInput.trim();
    const text = raw.replace(/\s+/g, ' ');

    const multi = MULTI.exec(text);
    if (multi) return measured(raw, Number(multi[1]), multi[2] ?? '', multi[3] ?? '');

    const single = SINGLE.exec(text);
    if (single) return measured(raw, 1, single[1] ?? '', single[2] ?? '');

    const pints = PINTS.exec(text);
    if (pints) {
        const perPack = Number(pints[1]) * ML_PER_UK_PINT;
        return perPack > 0 ? makeQuantity({ kind: 'volume', perPack, packCount: 1, raw }) : null;
    }

    const count = COUNT.exec(text);
    if (count) {
        const n = Number(count[1]);
        return n > 0 ? makeQuantity({ kind: 'count', perPack: n, packCount: 1, raw }) : null;
    }
    return null;
}

/** Converts a mass to grams, e.g. ("0.48", "KG") -> 480. Null for non-mass units. */
export function massToGrams(amount: string, unitText: string): number | null {
    const unit = UNITS[unitText.toLowerCase()];
    if (!unit || unit.kind !== 'mass') return null;
    return scaleDecimal(amount, unit.power);
}

/** A weighed item priced at a typical weight, e.g. chicken fillets "typically 340g, 200g-480g". */
export function variableMassQuantity(raw: string, typicalGrams: number, range: WeightRange): ProductQuantity | null {
    if (!(range.min <= typicalGrams && typicalGrams <= range.max)) return null;
    return makeQuantity({ kind: 'mass', perPack: typicalGrams, packCount: 1, raw, variableWeight: range });
}
