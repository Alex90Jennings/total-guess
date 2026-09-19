/**
 * Publishing a frozen game as a static file.
 *
 * The browser fetches /games/<date>.json from the same CDN that serves the
 * app, so the game cannot fail independently of the page it is played on.
 * There is no database, no API and no account involved in serving a game.
 *
 * Writing is create-only. A file that already exists is left exactly as it is
 * and reported as published — the same rule as the database trigger, for the
 * same reason: a game that has gone out must not change afterwards.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { decryptGame, encryptGame, gameFileId, isEncrypted } from './encryption.js';

export type PublishOutcome = 'created' | 'already_published' | 'failed';
export type PublishResult = { gameDate: string; outcome: PublishOutcome; error?: string };

export type PublishableGame = { gameDate: string; gameNumber: number; items: unknown[] };

/** What gets written. Deliberately the same shape the browser reads. */
const fileFor = (game: PublishableGame) => ({
    game_date: game.gameDate,
    game_number: game.gameNumber,
    items: game.items,
});

export const gameFilename = (gameDate: string, salt?: string) =>
    `${salt ? gameFileId(salt, gameDate) : gameDate}.json`;

/**
 * Writes the game. With a salt the body is encrypted so future games are not
 * casually readable; without one it is written in the clear, which keeps a
 * fresh clone playable.
 */
export async function publishGame(directory: string, game: PublishableGame, salt?: string): Promise<PublishResult> {
    const path = join(directory, gameFilename(game.gameDate, salt));
    try {
        if (existsSync(path)) return { gameDate: game.gameDate, outcome: 'already_published' };
        await mkdir(directory, { recursive: true });
        const body = salt ? encryptGame(salt, game.gameDate, fileFor(game)) : fileFor(game);
        await writeFile(path, `${JSON.stringify(body)}\n`, 'utf8');
        return { gameDate: game.gameDate, outcome: 'created' };
    } catch (error) {
        return { gameDate: game.gameDate, outcome: 'failed', error: String(error instanceof Error ? error.message : error) };
    }
}

/** Reads a published game back, for the operational check. */
export async function readPublishedGame(directory: string, gameDate: string, salt?: string): Promise<{ found: boolean; encrypted?: boolean; gameNumber?: number; itemCount?: number }> {
    try {
        const raw = await readFile(join(directory, gameFilename(gameDate, salt)), 'utf8');
        const parsed: unknown = JSON.parse(raw);
        const encrypted = isEncrypted(parsed);
        // Reading an encrypted game back is the check that the app will be able to.
        const game = (encrypted
            ? (salt ? await decryptGame(salt, gameDate, parsed) : null)
            : parsed) as { game_number?: number; items?: unknown[] } | null;
        if (!game) return { found: true, encrypted };
        return { found: true, encrypted, gameNumber: game.game_number, itemCount: Array.isArray(game.items) ? game.items.length : undefined };
    } catch {
        return { found: false };
    }
}

/**
 * How many games are published. The filenames are opaque once a salt is in
 * use, so this counts files; which dates they are comes from the database.
 */
export async function publishedFileCount(directory: string): Promise<number> {
    try {
        return (await readdir(directory)).filter((f) => f.endsWith('.json')).length;
    } catch {
        return 0;
    }
}
