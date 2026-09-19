/**
 * The guarantee: for a given date, every player gets the same game.
 *
 * That means the only acceptable sources are the published row and a cached
 * copy of that same row. These tests exist to stop a well-meaning local
 * fallback being reintroduced — it would hand a player a different basket,
 * a different total and an incomparable score without anyone noticing.
 */
import { fetchGameOfTheDay } from './dailyGame';
import { gameUrl } from './gameFile';

const date = new Date(Date.UTC(2026, 8, 19));

const items = [
    { _id: 'off:05000000000005', image: 'https://images.example/front.jpg', description: 'Baked Beans',
      quantity: '415g', price: 1.25, store: 'tesco', priceKind: 'observed', priceObservedOn: '2025-03-14',
      imageAttribution: 'Open Food Facts contributors' },
];
const publishedFile = { game_date: '2026-09-19', game_number: 1234, items };

/** Stands in for the CDN serving /games/<date>.json. */
const serves = (files) => jest.fn((path) => {
    const body = files[path];
    return Promise.resolve(body
        ? { ok: true, json: () => Promise.resolve(body) }
        : { ok: false, status: 404, json: () => Promise.reject(new Error('not found')) });
});

/** The published path for a date, derived exactly as the app derives it. */
let todaysUrl;

beforeEach(async () => {
    localStorage.clear();
    todaysUrl = await gameUrl('2026-09-19');
    global.fetch = serves({ [todaysUrl]: publishedFile });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { console.warn.mockRestore(); });

describe("today's game", () => {
    it('uses the published game', async () => {
        const game = await fetchGameOfTheDay(date);

        expect(global.fetch).toHaveBeenCalledWith(todaysUrl, expect.anything());
        expect(game).toMatchObject({ gameNumber: 1234, source: 'published' });
        expect(game.items).toEqual(items);
    });

    it('serves the identical game from cache when the fetch fails later in the day', async () => {
        const online = await fetchGameOfTheDay(date);

        global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
        const offline = await fetchGameOfTheDay(date);

        expect(offline.source).toBe('cache');
        expect(offline.items).toEqual(online.items);
        expect(offline.gameNumber).toBe(online.gameNumber);
    });

    it('returns nothing rather than a different basket when there is no cache', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
        expect(await fetchGameOfTheDay(date)).toBeNull();
    });

    it('returns nothing when the day has not been published', async () => {
        global.fetch = serves({});                       // 404 from the CDN
        expect(await fetchGameOfTheDay(date)).toBeNull();
    });

    it('is not fooled by the single-page-app rewrite serving index.html with a 200', async () => {
        // An unpublished date does not 404: the catch-all rewrite returns the app's
        // HTML shell, so "ok" is true and the body is not a game.
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
        }));
        expect(await fetchGameOfTheDay(date)).toBeNull();
    });

    it('never reuses another date\'s game', async () => {
        await fetchGameOfTheDay(date);                       // caches 2026-09-19

        global.fetch = jest.fn(() => Promise.reject(new Error('network down')));
        const tomorrow = new Date(Date.UTC(2026, 8, 20));
        expect(await fetchGameOfTheDay(tomorrow)).toBeNull();
    });

    it('treats an empty published game as unusable', async () => {
        global.fetch = serves({ [todaysUrl]: { ...publishedFile, items: [] } });
        expect(await fetchGameOfTheDay(date)).toBeNull();
    });

    it('survives storage being unavailable', async () => {
        const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect((await fetchGameOfTheDay(date)).source).toBe('published');
        setItem.mockRestore();
    });

    it('gives every item what the screen needs', async () => {
        const game = await fetchGameOfTheDay(date);
        for (const item of game.items) {
            expect(typeof item.description).toBe('string');
            expect(typeof item.price).toBe('number');
            expect(typeof item.store).toBe('string');
            expect(item.image).toBeTruthy();
        }
    });
});
