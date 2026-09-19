/**
 * Runs the adapter over real Morrisons pages in .captures/ (gitignored; see
 * README). Skipped when there are no captures, e.g. in CI.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseMorrisonsListingEntries, parseMorrisonsProductPage } from '../../src/adapters/morrisons/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.captures', 'morrisons');
const pages = (dir: string) => existsSync(join(root, dir))
    ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.html')).map((f) => join(root, dir, f))
    : [];
const context = (htmlPath: string) => {
    const meta = JSON.parse(readFileSync(htmlPath.replace(/\.html$/, '.meta.json'), 'utf8'));
    return { url: meta.url as string, fetchedAt: new Date(meta.fetchedAt).toISOString().replace(/\.\d{3}Z$/, 'Z') };
};

const productPages = pages('products');
const listingPages = pages('listings');

describe.skipIf(productPages.length === 0)('real Morrisons product pages', () => {
    it.each(productPages)('%s parses and validates', (path) => {
        const result = parseMorrisonsProductPage(readFileSync(path, 'utf8'), context(path));
        expect(result.ok ? [] : result.errors).toEqual([]);
    });
});

describe.skipIf(listingPages.length === 0)('real Morrisons listing pages', () => {
    it.each(listingPages)('%s: every product validates', (path) => {
        const entries = parseMorrisonsListingEntries(readFileSync(path, 'utf8'), context(path));
        expect(entries.length).toBeGreaterThan(0);
        expect(entries.filter((e) => !e.result.ok).map((e) => [e.retailerSku, !e.result.ok && e.result.errors])).toEqual([]);
    });
});
