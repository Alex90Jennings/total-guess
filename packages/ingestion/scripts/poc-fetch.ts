/**
 * Morrisons PoC capture script. DISABLED: Morrisons answered the first
 * automated request with HTTP 403 and marks its product data "personal use
 * only" (see docs/source-feasibility.md). The code is kept as a record of how
 * the PoC was run; it refuses to make requests and must not be re-enabled
 * without Morrisons' written consent.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AccessBlockedError, PoliteFetcher } from '../src/http/politeFetcher.js';

const here = dirname(fileURLToPath(import.meta.url));
const capturesDir = join(here, '..', '.captures', 'morrisons');
const USER_AGENT = 'total-guess-research/0.1 (+https://github.com/Alex90Jennings/total-guess)';
const ROBOTS_URL = 'https://groceries.morrisons.com/robots.txt';

type SampleEntry = { retailerSku: string; url: string };

/** Flip only with written consent from Morrisons. Changing the user agent is not a workaround. */
const MORRISONS_LIVE_ACCESS_PERMITTED = false;

async function main() {
    if (!MORRISONS_LIVE_ACCESS_PERMITTED) {
        console.error('Morrisons live access is disabled: see docs/source-feasibility.md');
        process.exitCode = 1;
        return;
    }
    const sample: SampleEntry[] = JSON.parse(await readFile(join(capturesDir, 'sample.json'), 'utf8'));
    await mkdir(capturesDir, { recursive: true });

    const robotsResponse = await fetch(ROBOTS_URL, { headers: { 'user-agent': USER_AGENT } });
    if (!robotsResponse.ok) throw new Error(`robots.txt returned ${robotsResponse.status}; not continuing`);
    const robotsTxt = await robotsResponse.text();
    await writeFile(join(capturesDir, 'robots.txt'), robotsTxt);

    const fetcher = new PoliteFetcher({
        userAgent: USER_AGENT,
        robotsUrl: ROBOTS_URL,
        robotsTxt,
        minIntervalMs: 5_000,
        jitterMs: 2_000,
        maxRetries: 2,
    });

    for (const { retailerSku, url } of sample) {
        const htmlPath = join(capturesDir, `${retailerSku}.html`);
        if (existsSync(htmlPath)) {
            console.log(`skip ${retailerSku} (already captured)`);
            continue;
        }
        try {
            const page = await fetcher.get(url);
            await writeFile(htmlPath, page.body);
            await writeFile(
                join(capturesDir, `${retailerSku}.meta.json`),
                JSON.stringify({ requestedUrl: url, url: page.url, status: page.status, fetchedAt: page.fetchedAt }, null, 2),
            );
            console.log(`${page.status} ${retailerSku} ${page.body.length} bytes`);
        } catch (error) {
            if (error instanceof AccessBlockedError) {
                console.error(`stopping: ${error.message}`);
                process.exitCode = 1;
                return;
            }
            throw error;
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
