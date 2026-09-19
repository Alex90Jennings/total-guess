/**
 * Pulls the machine-readable blobs out of a Morrisons page. Nothing is read
 * from rendered HTML text: the page ships its own data as JSON.
 *
 *   product page:  <script data-test="product-details-structured-data">  schema.org JSON-LD
 *                  <script data-test="query-initial-state">  window.__QUERY_INITIAL_STATE__ = {...}
 *   listing page:  <script data-test="initial-state-script"> window.__INITIAL_STATE__ = {...}
 */
import { parse, type HTMLElement } from 'node-html-parser';

export class ExtractionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExtractionError';
    }
}

function scriptByDataTest(root: HTMLElement, dataTest: string): string | null {
    const script = root.querySelector(`script[data-test="${dataTest}"]`);
    return script ? script.rawText : null;
}

/** `window.__X__={...};` -> the parsed object. */
function assignedJson(source: string, variable: string): unknown {
    const prefix = `window.${variable}=`;
    const start = source.indexOf(prefix);
    if (start === -1) throw new ExtractionError(`${variable} assignment not found`);
    const json = source.slice(start + prefix.length).trim().replace(/;$/, '');
    try {
        return JSON.parse(json);
    } catch (error) {
        throw new ExtractionError(`${variable} is not valid JSON: ${(error as Error).message}`);
    }
}

export type ProductPageBlobs = {
    jsonLd: unknown | null;
    queryState: unknown;
};

export function extractProductPage(html: string): ProductPageBlobs {
    const root = parse(html);
    const query = scriptByDataTest(root, 'query-initial-state');
    if (query === null) throw new ExtractionError('query-initial-state script not found');

    const ld = scriptByDataTest(root, 'product-details-structured-data');
    let jsonLd: unknown | null = null;
    if (ld !== null) {
        try {
            jsonLd = JSON.parse(ld);
        } catch {
            throw new ExtractionError('product JSON-LD is not valid JSON');
        }
    }
    return { jsonLd, queryState: assignedJson(query, '__QUERY_INITIAL_STATE__') };
}

export type ListingPageBlobs = {
    initialState: unknown;
    /** Product URLs linked from the page, keyed by retailer SKU (the last path segment). */
    productUrls: Map<string, string>;
};

export function extractListingPage(html: string, pageUrl: string): ListingPageBlobs {
    const root = parse(html);
    const state = scriptByDataTest(root, 'initial-state-script');
    if (state === null) throw new ExtractionError('initial-state-script not found');

    const productUrls = new Map<string, string>();
    for (const anchor of root.querySelectorAll('a[href^="/products/"]')) {
        const href = anchor.getAttribute('href');
        const sku = href?.match(/^\/products\/[^/?#]+\/(\d+)$/)?.[1];
        if (href && sku && !productUrls.has(sku)) productUrls.set(sku, new URL(href, pageUrl).toString());
    }
    return { initialState: assignedJson(state, '__INITIAL_STATE__'), productUrls };
}
