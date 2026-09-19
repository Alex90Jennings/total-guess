/**
 * Retailers: who sells the product, as opposed to who supplied the data.
 *
 * The registry is the only place retailer identity lives. Business logic
 * resolves names through resolveRetailer() and never matches retailer names
 * itself. Shops that are not in the registry (independents, small chains)
 * resolve to null; the store keeps the name exactly as the source gave it.
 */
import { z } from 'zod';

type RetailerEntry = { name: string; aliases: string[] };

export const RETAILER_REGISTRY = {
    tesco: { name: 'Tesco', aliases: ['tesco', 'tesco express', 'tesco extra', 'tesco superstore', 'tesco metro'] },
    sainsburys: { name: "Sainsbury's", aliases: ["sainsbury's", 'sainsburys', "sainsbury's local", 'sainsburys local'] },
    asda: { name: 'Asda', aliases: ['asda', 'asda superstore', 'asda supercentre', 'asda express'] },
    morrisons: { name: 'Morrisons', aliases: ['morrisons', 'morrisons daily'] },
    lidl: { name: 'Lidl', aliases: ['lidl', 'lidl gb'] },
    aldi: { name: 'Aldi', aliases: ['aldi'] },
    waitrose: { name: 'Waitrose', aliases: ['waitrose', 'waitrose & partners', 'little waitrose'] },
    coop: { name: 'Co-op', aliases: ['co-op', 'coop', 'co-op food', 'the co-operative food', 'the co-operative', 'central co-op'] },
    mands: { name: 'M&S', aliases: ['m&s', 'marks & spencer', 'marks and spencer', 'm&s simply food', 'm&s foodhall'] },
    iceland: { name: 'Iceland', aliases: ['iceland', 'iceland foods'] },
} as const satisfies Record<string, RetailerEntry>;

export type RetailerId = keyof typeof RETAILER_REGISTRY;
export const RETAILER_IDS = Object.keys(RETAILER_REGISTRY) as [RetailerId, ...RetailerId[]];
export const RetailerIdSchema = z.enum(RETAILER_IDS);

export function retailerName(id: RetailerId): string {
    return RETAILER_REGISTRY[id].name;
}

/** Lowercase, straight apostrophes, "and" -> "&", single spaces. */
export function normaliseRetailerName(text: string): string {
    return text
        .toLowerCase()
        .replace(/[‘’`]/g, "'")
        .replace(/\s+and\s+/g, ' & ')
        .replace(/[^a-z0-9&' -]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const ALIASES: [string, RetailerId][] = (Object.entries(RETAILER_REGISTRY) as [RetailerId, RetailerEntry][])
    .flatMap(([id, entry]) => entry.aliases.map((alias): [string, RetailerId] => [normaliseRetailerName(alias), id]))
    // Longest first, so "tesco express" is tried before "tesco".
    .sort((a, b) => b[0].length - a[0].length);

/**
 * A store brand or name -> RetailerId, or null if it is not a registered
 * retailer. Matches a whole alias, or an alias followed by more words
 * ("Tesco Express Cardiff Road"); never a substring inside another word.
 */
export function resolveRetailer(...candidates: (string | null | undefined)[]): RetailerId | null {
    for (const candidate of candidates) {
        if (!candidate) continue;
        const name = normaliseRetailerName(candidate);
        for (const [alias, id] of ALIASES) {
            if (name === alias || name.startsWith(`${alias} `)) return id;
        }
    }
    return null;
}
