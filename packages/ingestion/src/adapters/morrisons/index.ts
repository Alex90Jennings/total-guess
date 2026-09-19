import type { RetailerAdapter } from '../types.js';
import { parseMorrisonsListingEntries } from './listingPage.js';
import { parseMorrisonsProductPage } from './productPage.js';

export const morrisonsAdapter: RetailerAdapter = {
    retailer: 'morrisons',
    parseProductPage: parseMorrisonsProductPage,
    parseListingPage: (html, context) => parseMorrisonsListingEntries(html, context).map((entry) => entry.result),
};

export { parseMorrisonsListingEntries, parseMorrisonsProductPage };
export type { CatalogueHints, ListingEntry } from './listingPage.js';
export { nutritionFromTable, parseNutritionTable, ukDate } from './productPage.js';
