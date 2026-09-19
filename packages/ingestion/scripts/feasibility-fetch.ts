/**
 * Source feasibility test, network half. Saves raw API responses to
 * .captures/ (gitignored); feasibility-report.ts does the analysis offline.
 *
 * Open Food Facts: a handful of search calls, inside the documented limit of
 *   10 searches/min (https://openfoodfacts.github.io/openfoodfacts-server/api/).
 *   Anything larger should use the nightly dumps, not the API.
 * Open Prices: every GBP price, paged, plus UK locations for a cross-check.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PoliteFetcher } from '../src/http/politeFetcher.js';
import { canonicalGtin, isGs1UkPrefix } from '../src/normalise/gtin.js';

const here = dirname(fileURLToPath(import.meta.url));
const captures = join(here, '..', '.captures');
// OFF asks for "AppName/Version (contact)". Set FEASIBILITY_CONTACT to an address you choose to share.
const USER_AGENT = `TotalGuess/0.1 (${process.env.FEASIBILITY_CONTACT ?? '+https://github.com/Alex90Jennings/total-guess'})`;
const SAMPLE_SIZE = 100;
const MAX_SEARCH_PAGES = 5;

const OFF_FIELDS = [
    'code', 'product_type', 'lang', 'product_name', 'product_name_en', 'generic_name', 'generic_name_en', 'brands',
    'quantity', 'product_quantity', 'product_quantity_unit', 'categories_hierarchy', 'ingredients_text',
    'ingredients_text_en', 'allergens_tags', 'traces_tags', 'labels_tags', 'ingredients_analysis_tags', 'nutriments',
    'nutrition_data_per', 'image_front_url', 'image_url', 'countries_tags', 'stores_tags', 'last_modified_t', 'unique_scans_n',
].join(',');

async function cached(path: string, load: () => Promise<string>): Promise<unknown> {
    if (!existsSync(path)) await writeFile(path, await load());
    return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
    await mkdir(join(captures, 'openfoodfacts'), { recursive: true });
    await mkdir(join(captures, 'openprices'), { recursive: true });

    const off = new PoliteFetcher({
        documentedApi: 'https://openfoodfacts.github.io/openfoodfacts-server/api/',
        userAgent: USER_AGENT, accept: 'application/json', minIntervalMs: 7_000, maxRetries: 2,
    });
    const prices = new PoliteFetcher({
        documentedApi: 'https://prices.openfoodfacts.org/api/docs',
        userAgent: USER_AGENT, accept: 'application/json', minIntervalMs: 1_500, maxRetries: 2,
    });
    const body = async (fetcher: PoliteFetcher, url: string) => {
        const page = await fetcher.get(url);
        if (page.status !== 200) throw new Error(`HTTP ${page.status} for ${url}`);
        return page.body;
    };

    // 1. The most-scanned UK food products, keeping GS1 UK barcodes (prefix 500-509).
    const sample = new Set<string>();
    for (let page = 1; page <= MAX_SEARCH_PAGES && sample.size < SAMPLE_SIZE; page++) {
        const url = 'https://world.openfoodfacts.org/api/v2/search?countries_tags_en=united-kingdom&product_type=food'
            + `&sort_by=unique_scans_n&page_size=100&page=${page}&fields=${OFF_FIELDS}`;
        const data = await cached(join(captures, 'openfoodfacts', `search-p${page}.json`), () => body(off, url)) as { products: { code: string }[] };
        for (const product of data.products) {
            const gtin = canonicalGtin(product.code);
            if (gtin && isGs1UkPrefix(gtin) && sample.size < SAMPLE_SIZE) sample.add(product.code);
        }
        console.log(`OFF search page ${page}: ${data.products.length} products, sample now ${sample.size}`);
    }
    await writeFile(join(captures, 'openfoodfacts', 'sample-codes.json'), JSON.stringify([...sample], null, 2));

    // 2. Every GBP price on Open Prices.
    for (let page = 1; ; page++) {
        const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=GBP&order_by=id&size=100&page=${page}`;
        const data = await cached(join(captures, 'openprices', `gbp-p${page}.json`), () => body(prices, url)) as { items: unknown[]; pages: number; total: number };
        console.log(`Open Prices GBP page ${page}/${data.pages}: ${data.items.length} (total ${data.total})`);
        if (page >= data.pages) break;
    }

    // 3. UK locations, to check GBP is a fair proxy for "UK" (price_count per location).
    for (let page = 1; ; page++) {
        const url = `https://prices.openfoodfacts.org/api/v1/locations?osm_address_country__like=United%20Kingdom&size=100&page=${page}`;
        const data = await cached(join(captures, 'openprices', `uk-locations-p${page}.json`), () => body(prices, url)) as { items: unknown[]; pages: number; total: number };
        console.log(`Open Prices UK locations page ${page}/${data.pages}: ${data.items.length} (total ${data.total})`);
        if (page >= data.pages) break;
    }

    // 4. Any-currency prices for the sample barcodes (do they have prices anywhere?).
    const codes = [...sample];
    for (let i = 0; i < codes.length; i += 50) {
        const chunk = codes.slice(i, i + 50);
        const url = `https://prices.openfoodfacts.org/api/v1/prices?product_code__in=${chunk.join(',')}&size=100`;
        const data = await cached(join(captures, 'openprices', `sample-any-currency-${i / 50 + 1}.json`), () => body(prices, url)) as { total: number };
        console.log(`Open Prices any-currency prices for sample chunk ${i / 50 + 1}: total ${data.total}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
