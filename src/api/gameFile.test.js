/**
 * The browser half of the published-game format.
 *
 * The fixture below was produced by the real publisher
 * (packages/ingestion/src/game/encryption.ts). If either implementation drifts
 * — key derivation, filename, or the position of the GCM tag — this fails,
 * which is the point: the two have to agree or nobody can play.
 */
// The module reads the salt at import time, so it is set before requiring it.
process.env.REACT_APP_GAMES_SALT = "test-salt-for-the-fixture";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gameUrl, readGameFile } = require('./gameFile');

const FIXTURE = {
  "salt": "test-salt-for-the-fixture",
  "date": "2026-09-19",
  "filename": "411b1607a3b7c007db8de3abe8793799.json",
  "envelope": {
    "v": 1,
    "iv": "5Hphw4upc7d4jaDp",
    "data": "x/6BfUjeIDpYZcg3mny+PEZE353P0TlpbffGVYBVycUfGenba2Uc/43snNX+jUA4GXtNfKQKqQGYq0Z0BXVC7xjBoOcyOYMug6VJ7447xBmqYnlOl32yV+r5Gw9oUCB2c7YTk+oH4540p70Scs3YQWa1xdEdfC5G0iTnnoiTRUsxSoG8t2cC1o2FJ/YJ2D2FlBUWmSJ3IITE7PUKTYipnPg0n4Eq9i9auv3o6zyAe0q5c1kvxqN8jq/hfUVZI+1NKlSAZBrpw6CjEQCtScZpdUbPyS6t5gUL5lEnYc0JDKIs1q0BftCAUUlGMzEgn73Hn+rj/P2diF9uljW1iNbPlgfM2PZeTW+iFfacX2/i15kaOqTI5QGdb7hBReYA5/npFoUXr882Ju9KqFb1GzmiRq5XCB2/GVlA16xxrZUdDeQxHQ=="
  }
};

describe('reading a published game file', () => {
    it('derives the same filename the publisher used', async () => {
        expect(await gameUrl(FIXTURE.date)).toBe(`/games/${FIXTURE.filename}`);
    });

    it('decrypts a file produced by the publisher', async () => {
        const game = await readGameFile(FIXTURE.date, FIXTURE.envelope);
        expect(game).toMatchObject({ game_date: FIXTURE.date, game_number: 1234 });
        expect(game.items[0]).toMatchObject({ store: 'tesco', price: 1.25, priceObservedOn: '2025-03-14' });
    });

    it('refuses a file encrypted for a different date', async () => {
        await expect(readGameFile('2026-09-20', FIXTURE.envelope)).rejects.toThrow();
    });

    it('passes through a game that was published unencrypted', async () => {
        const plain = { game_date: '2026-09-19', game_number: 7, items: [{ price: 1 }] };
        expect(await readGameFile('2026-09-19', plain)).toEqual(plain);
    });
});
