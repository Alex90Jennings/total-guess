/**
 * A deliberately unaggressive HTTP client.
 *
 * - Checks robots.txt before every request and refuses disallowed paths,
 *   unless the target is an API whose operator documents programmatic use
 *   (e.g. Open Food Facts, whose robots.txt disallows /api for crawlers while
 *   its API docs invite apps to call it within stated rate limits). The
 *   exemption must name that documentation, so it cannot be used casually.
 * - Spaces requests out (minimum interval plus jitter), one at a time.
 * - Honours Retry-After on 429/503 and backs off exponentially on 5xx.
 * - Treats 401/403 as "we are not welcome": the fetcher trips and refuses
 *   every later request. It never retries a block, rotates identity or
 *   tries to look like a browser.
 */
import { createRequire } from 'node:module';

// robots-parser is CommonJS (`module.exports = fn`) but ships ESM-style
// typings, which NodeNext resolution cannot call. Load it directly instead.
type Robots = { isAllowed(url: string, userAgent?: string): boolean | undefined };
const robotsParser = createRequire(import.meta.url)('robots-parser') as (url: string, robotsTxt: string) => Robots;

export type FetchedPage = {
    url: string;
    status: number;
    body: string;
    /** ISO 8601 UTC, taken when the response arrived. */
    fetchedAt: string;
};

type AccessPolicy =
    | { robotsUrl: string; robotsTxt: string; documentedApi?: never }
    /** URL of the operator's API documentation that authorises this use. */
    | { documentedApi: string; robotsUrl?: never; robotsTxt?: never };

export type PoliteFetcherOptions = AccessPolicy & {
    userAgent: string;
    minIntervalMs: number;
    accept?: string;
    jitterMs?: number;
    maxRetries?: number;
    maxRetryAfterMs?: number;
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    random?: () => number;
};

export class DisallowedByRobotsError extends Error {
    constructor(readonly url: string) {
        super(`robots.txt disallows ${url}`);
        this.name = 'DisallowedByRobotsError';
    }
}

export class AccessBlockedError extends Error {
    constructor(readonly url: string, readonly status: number | null) {
        super(status === null
            ? `fetcher stopped after an earlier block; refusing ${url}`
            : `HTTP ${status} for ${url}; stopping instead of retrying`);
        this.name = 'AccessBlockedError';
    }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const BLOCKED = new Set([401, 403]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class PoliteFetcher {
    private readonly robots: Robots | null;
    private readonly fetchImpl: typeof fetch;
    private readonly sleep: (ms: number) => Promise<void>;
    private readonly now: () => number;
    private readonly random: () => number;
    private lastRequestAt: number | null = null;
    private blocked = false;

    constructor(private readonly options: PoliteFetcherOptions) {
        this.robots = options.documentedApi === undefined
            ? robotsParser(options.robotsUrl, options.robotsTxt)
            : null;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.sleep = options.sleep ?? defaultSleep;
        this.now = options.now ?? Date.now;
        this.random = options.random ?? Math.random;
    }

    isAllowed(url: string): boolean {
        if (this.robots === null) return true;
        return this.robots.isAllowed(url, this.options.userAgent) !== false;
    }

    async get(url: string): Promise<FetchedPage> {
        if (this.blocked) throw new AccessBlockedError(url, null);
        if (!this.isAllowed(url)) throw new DisallowedByRobotsError(url);

        const maxRetries = this.options.maxRetries ?? 2;
        for (let attempt = 0; ; attempt++) {
            await this.waitForSlot();
            const response = await this.fetchImpl(url, {
                headers: { 'user-agent': this.options.userAgent, accept: this.options.accept ?? 'text/html,application/xhtml+xml' },
                redirect: 'follow',
            });
            this.lastRequestAt = this.now();

            if (BLOCKED.has(response.status)) {
                this.blocked = true;
                throw new AccessBlockedError(url, response.status);
            }
            if (RETRYABLE.has(response.status) && attempt < maxRetries) {
                await this.sleep(this.retryDelay(response, attempt));
                continue;
            }
            return {
                url: response.url || url,
                status: response.status,
                body: await response.text(),
                fetchedAt: new Date(this.now()).toISOString(),
            };
        }
    }

    private async waitForSlot(): Promise<void> {
        if (this.lastRequestAt === null) return;
        const jitter = Math.floor(this.random() * (this.options.jitterMs ?? 0));
        const due = this.lastRequestAt + this.options.minIntervalMs + jitter;
        const wait = due - this.now();
        if (wait > 0) await this.sleep(wait);
    }

    private retryDelay(response: Response, attempt: number): number {
        const cap = this.options.maxRetryAfterMs ?? 120_000;
        const header = response.headers.get('retry-after');
        if (header !== null) {
            const seconds = Number(header);
            if (Number.isFinite(seconds)) return Math.min(seconds * 1000, cap);
            const date = Date.parse(header);
            if (!Number.isNaN(date)) return Math.min(Math.max(date - this.now(), 0), cap);
        }
        return Math.min(this.options.minIntervalMs * 2 ** (attempt + 1), cap);
    }
}
