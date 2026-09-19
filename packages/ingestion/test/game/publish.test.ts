import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { decryptGame, gameFileId, isEncrypted } from '../../src/game/encryption.js';
import { publishGame, publishedFileCount, readPublishedGame } from '../../src/game/publish.js';

let directory: string;
const game = { gameDate: '2026-09-19', gameNumber: 1234, items: [{ _id: 'curated:te0001', price: 1.5, store: 'tesco' }] };

beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'tg-games-')); });

describe('publishing a game as a static file', () => {
    it('writes one file per date, in the shape the browser reads', async () => {
        expect(await publishGame(directory, game)).toEqual({ gameDate: '2026-09-19', outcome: 'created' });

        const written = JSON.parse(await readFile(join(directory, '2026-09-19.json'), 'utf8'));
        expect(written).toEqual({ game_date: '2026-09-19', game_number: 1234, items: game.items });
    });

    it('never overwrites a game that is already published', async () => {
        await publishGame(directory, game);
        const before = await readFile(join(directory, '2026-09-19.json'), 'utf8');

        const second = await publishGame(directory, { ...game, gameNumber: 9999, items: [{ _id: 'different' }] });
        expect(second).toEqual({ gameDate: '2026-09-19', outcome: 'already_published' });
        expect(await readFile(join(directory, '2026-09-19.json'), 'utf8')).toBe(before);
    });

    it('creates the directory when it does not exist yet', async () => {
        const nested = join(directory, 'public', 'games');
        expect((await publishGame(nested, game)).outcome).toBe('created');
        expect(await readPublishedGame(nested, '2026-09-19')).toEqual({ found: true, encrypted: false, gameNumber: 1234, itemCount: 1 });
    });

    it('reports a failure instead of throwing, so one bad day does not stop the rest', async () => {
        // A path that cannot be a directory, because it is a file.
        const blocked = join(directory, 'not-a-directory');
        await writeFile(blocked, 'x', 'utf8');
        const result = await publishGame(blocked, game);
        expect(result.outcome).toBe('failed');
        expect(result.error).toBeTruthy();
    });

    it('reads a published game back, and says so when there is none', async () => {
        await publishGame(directory, game);
        expect(await readPublishedGame(directory, '2026-09-19')).toEqual({ found: true, encrypted: false, gameNumber: 1234, itemCount: 1 });
        expect(await readPublishedGame(directory, '2026-09-20')).toEqual({ found: false });
    });

    it('counts the published games, ignoring anything that is not one', async () => {
        await publishGame(directory, game);
        await publishGame(directory, { ...game, gameDate: '2026-09-21', gameNumber: 1236 });
        await writeFile(join(directory, 'README.md'), 'not a game', 'utf8');

        expect(await publishedFileCount(directory)).toBe(2);
        expect(await publishedFileCount(join(directory, 'nowhere'))).toBe(0);
    });
});

describe('with a salt, a published game is not casually readable', () => {
    const salt = 'a-shared-secret';

    it('names the file after an HMAC of the date, not the date', async () => {
        await publishGame(directory, game, salt);

        const expected = `${gameFileId(salt, '2026-09-19')}.json`;
        expect(expected).not.toContain('2026-09-19');
        expect(existsSync(join(directory, expected))).toBe(true);
        expect(existsSync(join(directory, '2026-09-19.json'))).toBe(false);
    });

    it('encrypts the body, so the file gives away nothing', async () => {
        await publishGame(directory, game, salt);
        const raw = await readFile(join(directory, `${gameFileId(salt, '2026-09-19')}.json`), 'utf8');

        expect(raw).not.toContain('tesco');
        expect(raw).not.toContain('1234');
        const envelope = JSON.parse(raw);
        expect(isEncrypted(envelope)).toBe(true);
        expect(await decryptGame(salt, '2026-09-19', envelope)).toEqual({
            game_date: '2026-09-19', game_number: 1234, items: game.items,
        });
    });

    it('gives each date a different key and filename', async () => {
        expect(gameFileId(salt, '2026-09-19')).not.toBe(gameFileId(salt, '2026-09-20'));
        expect(gameFileId(salt, '2026-09-19')).not.toBe(gameFileId('another-secret', '2026-09-19'));
    });

    it('cannot be decrypted with the wrong salt', async () => {
        await publishGame(directory, game, salt);
        const envelope = JSON.parse(await readFile(join(directory, `${gameFileId(salt, '2026-09-19')}.json`), 'utf8'));
        await expect(decryptGame('the-wrong-secret', '2026-09-19', envelope)).rejects.toThrow();
        await expect(decryptGame(salt, '2026-09-20', envelope)).rejects.toThrow();
    });

    it('reads back through the check command, and reports when the salt is wrong', async () => {
        await publishGame(directory, game, salt);
        expect(await readPublishedGame(directory, '2026-09-19', salt))
            .toEqual({ found: true, encrypted: true, gameNumber: 1234, itemCount: 1 });
        // Wrong salt: the file is not even found, because its name is derived too.
        expect(await readPublishedGame(directory, '2026-09-19', 'wrong')).toEqual({ found: false });
    });
});
