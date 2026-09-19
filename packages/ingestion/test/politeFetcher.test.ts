import { describe, expect, it, vi } from 'vitest';
import { AccessBlockedError, DisallowedByRobotsError, PoliteFetcher } from '../src/http/politeFetcher.js';

const ROBOTS = 'User-agent: *\nDisallow: /api/\nDisallow: /sso-login\n';

function setup(responses: Response[]) {
    let clock = 1_000_000;
    const sleeps: number[] = [];
    const fetchImpl = vi.fn(async () => {
        const next = responses.shift();
        if (!next) throw new Error('unexpected request');
        return next;
    });
    const fetcher = new PoliteFetcher({
        userAgent: 'test-agent/1.0',
        robotsUrl: 'https://shop.example/robots.txt',
        robotsTxt: ROBOTS,
        minIntervalMs: 5_000,
        jitterMs: 0,
        maxRetries: 2,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleep: async (ms) => { sleeps.push(ms); clock += ms; },
        now: () => clock,
    });
    return { fetcher, fetchImpl, sleeps };
}

describe('PoliteFetcher', () => {
    it('refuses paths robots.txt disallows, without sending a request', async () => {
        const { fetcher, fetchImpl } = setup([]);
        await expect(fetcher.get('https://shop.example/api/products/1')).rejects.toBeInstanceOf(DisallowedByRobotsError);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('spaces consecutive requests by the minimum interval', async () => {
        const { fetcher, sleeps } = setup([new Response('a'), new Response('b')]);
        await fetcher.get('https://shop.example/products/a/1');
        await fetcher.get('https://shop.example/products/b/2');
        expect(sleeps).toEqual([5_000]);
    });

    it('identifies itself with its user agent', async () => {
        const { fetcher, fetchImpl } = setup([new Response('ok')]);
        await fetcher.get('https://shop.example/products/a/1');
        expect(fetchImpl).toHaveBeenCalledWith('https://shop.example/products/a/1', expect.objectContaining({
            headers: expect.objectContaining({ 'user-agent': 'test-agent/1.0' }),
        }));
    });

    it('stops on 403 and refuses every later request without retrying', async () => {
        const { fetcher, fetchImpl } = setup([new Response('denied', { status: 403 })]);
        await expect(fetcher.get('https://shop.example/products/a/1')).rejects.toBeInstanceOf(AccessBlockedError);
        await expect(fetcher.get('https://shop.example/products/b/2')).rejects.toBeInstanceOf(AccessBlockedError);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('honours Retry-After on 429, then succeeds', async () => {
        const { fetcher, sleeps } = setup([
            new Response('slow down', { status: 429, headers: { 'retry-after': '30' } }),
            new Response('ok'),
        ]);
        const page = await fetcher.get('https://shop.example/products/a/1');
        expect(page.status).toBe(200);
        expect(sleeps[0]).toBe(30_000);
    });

    it('gives up after the retry budget and returns the last status', async () => {
        const { fetcher, fetchImpl } = setup([
            new Response('', { status: 503 }), new Response('', { status: 503 }), new Response('', { status: 503 }),
        ]);
        expect((await fetcher.get('https://shop.example/products/a/1')).status).toBe(503);
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('skips robots.txt only for an API whose documentation is named, and still stops on 403', async () => {
        const fetchImpl = vi.fn(async () => new Response('denied', { status: 403 }));
        const api = new PoliteFetcher({
            documentedApi: 'https://api.example/docs',
            userAgent: 'test-agent/1.0', minIntervalMs: 0, accept: 'application/json',
            fetchImpl: fetchImpl as unknown as typeof fetch,
        });
        expect(api.isAllowed('https://api.example/api/v2/search')).toBe(true);
        await expect(api.get('https://api.example/api/v2/search')).rejects.toBeInstanceOf(AccessBlockedError);
        expect(fetchImpl).toHaveBeenCalledWith('https://api.example/api/v2/search', expect.objectContaining({
            headers: expect.objectContaining({ accept: 'application/json' }),
        }));
    });

    it('stamps fetchedAt from its clock, in UTC', async () => {
        const { fetcher } = setup([new Response('ok')]);
        expect((await fetcher.get('https://shop.example/products/a/1')).fetchedAt).toBe(new Date(1_000_000).toISOString());
    });
});
