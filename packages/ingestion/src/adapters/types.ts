import type { ParseResult, PriceObservation, ProductListing, RetailerId } from '../contract/index.js';

/** What the fetcher knows about a page; the parser never reads the clock itself. */
export type PageContext = {
    url: string;
    /** ISO 8601 UTC, from the fetch. */
    fetchedAt: string;
};

export type ProductPageResult = { listing: ProductListing; price: PriceObservation };

/**
 * One per retailer website. Everything retailer-specific stays behind this
 * interface; downstream code only ever sees validated contract types.
 */
export interface RetailerAdapter {
    readonly retailer: RetailerId;
    parseProductPage(html: string, context: PageContext): ParseResult<ProductPageResult>;
    parseListingPage?(html: string, context: PageContext): ParseResult<PriceObservation>[];
}
