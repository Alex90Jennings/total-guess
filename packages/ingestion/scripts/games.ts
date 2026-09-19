/**
 * The daily game's operations, in one place.
 *
 *   yarn games generate [--days 14]   fill any missing day in the rolling window
 *   yarn games publish                copy unpublished games to Appwrite
 *   yarn games mirror                 copy catalogue photographs onto our own CDN
 *   yarn games check [--min 7]        are there enough games ahead? exits 1 if not
 *   yarn games show [--date YYYY-MM-DD]
 *
 * A cron that runs `generate && publish` daily, and `check` as a health probe,
 * is the entire schedule. Nothing here is required at play time.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from '../src/assistant/config.js';
import { openDatabase } from '../src/db/client.js';
import {
    generateGames, isoDate, markPublished, readGame, readGamesFrom, readiness, utcDay,
} from '../src/game/dailyGame.js';
import { mirrorImages, mirroredPath } from '../src/game/mirrorImages.js';
import { publishGame, publishedFileCount, readPublishedGame } from '../src/game/publish.js';

/** Published games live with the app, so Vercel serves them from the same CDN. */
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public');
const GAMES_DIR = join(PUBLIC_DIR, 'games');

const arg = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
    loadEnvFile();
    // Shared with the app as REACT_APP_GAMES_SALT; without it games are published in the clear.
    const salt = process.env.GAMES_SALT;
    const command = process.argv[2] ?? 'check';
    const db = await openDatabase();
    try {
        if (command === 'generate') {
            const result = await generateGames(db, { days: Number(arg('days') ?? 14) });
            console.log(`pool ${result.poolSize} items (${Math.floor(result.poolSize / 10)} days per cycle)`);
            console.log(`created ${result.created.length}: ${result.created.join(', ') || '(none)'}`);
            console.log(`already present ${result.alreadyPresent.length}`);
            return;
        }

        if (command === 'publish') {
            const pending = (await readGamesFrom(db, isoDate(utcDay()))).filter((g) => !g.publishedAt);
            if (!pending.length) { console.log('nothing to publish'); return; }
            let created = 0, existing = 0, failures = 0;
            for (const game of pending) {
                const result = await publishGame(GAMES_DIR, game, salt);
                if (result.outcome === 'failed') { failures++; console.error(`${game.gameDate}  FAILED  ${result.error}`); continue; }
                await markPublished(db, game.gameDate);
                if (result.outcome === 'created') created++; else existing++;
            }
            console.log(`wrote ${created} ${salt ? 'encrypted ' : ''}game${created === 1 ? '' : 's'} to public/games/`
                + (existing ? `, ${existing} already there` : '')
                + (failures ? `, ${failures} FAILED` : ''));
            if (created) console.log('commit and deploy them to put them live: git add public/games && git commit && git push');
            if (!salt) console.log('note: GAMES_SALT is not set, so these are readable by anyone who guesses the URL');
            if (failures) process.exitCode = 1;
            return;
        }

        if (command === 'mirror') {
            // Every catalogue product that can appear in a game, whether or not
            // it has been drawn yet, so a later game never waits on a download.
            const { rows } = await db.query<{ barcode: string; url: string }>(
                `SELECT replace(item_id, 'off:', '') AS barcode, image AS url
                 FROM eligible_game_item WHERE image LIKE 'http%' ORDER BY item_id`);
            console.log(`${rows.length} catalogue photographs to mirror into public/off/`);

            const result = await mirrorImages(rows, PUBLIC_DIR, {
                onProgress: (done, total) => {
                    if (done % 50 === 0 || done === total) process.stderr.write(`  ${done}/${total}\n`);
                },
            });
            console.log(`copied ${result.copied}, already there ${result.alreadyThere}, failed ${result.failed.length}`);
            console.log(`public/off is now ${(result.bytes / 1024 / 1024).toFixed(1)} MB`);
            for (const failure of result.failed.slice(0, 10)) console.error(`  ${failure.barcode}: ${failure.reason}`);
            if (result.failed.length) process.exitCode = 1;
            return;
        }

        if (command === 'check') {
            const minimum = Number(arg('min') ?? 7);
            const state = await readiness(db);
            const today = isoDate(utcDay());
            const day = (iso: string | null) => (iso
                ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
                : 'never');

            const problems: string[] = [];
            if (!state.today) problems.push('today has no game');
            if (state.futureDays < minimum) problems.push(`only ${state.futureDays} days ahead (minimum ${minimum})`);

            const live = await readPublishedGame(GAMES_DIR, today, salt);
            if (!live.found) problems.push('today is not published to public/games/');
            const publishedFiles = await publishedFileCount(GAMES_DIR);

            console.log(`Today:             ${state.today ? `ready (game #${state.today.gameNumber}, ${state.today.items.length} items)` : 'MISSING'}`);
            console.log(`Published through: ${day(state.publishedThrough)}`);
            console.log(`Generated through: ${day(state.generatedThrough)}`);
            console.log(`Days remaining:    ${state.futureDays}`);
            console.log(`Published files:   ${publishedFiles.toLocaleString('en-GB')}`);
            console.log(`Eligible pool:     ${state.poolSize.toLocaleString('en-GB')}`);
            console.log(`Today's file:      ${live.found ? `yes (game #${live.gameNumber}, ${live.itemCount} items)` : 'MISSING'}`);
            console.log(`Encrypted:         ${live.found ? (live.encrypted ? (live.gameNumber ? 'yes, and decrypts with the configured salt' : 'yes, but NOT decryptable with this salt') : 'no — readable by anyone') : 'n/a'}`);
            console.log(`Status:            ${problems.length ? `NOT OK — ${problems.join('; ')}` : 'OK'}`);
            if (problems.length) process.exitCode = 1;
            return;
        }

        if (command === 'show') {
            const game = await readGame(db, arg('date') ?? isoDate(utcDay()));
            if (!game) { console.log('no game for that date'); process.exitCode = 1; return; }
            console.log(`game #${game.gameNumber} for ${game.gameDate}, generated ${game.generatedAt}, pool ${game.poolSize}`);
            let total = 0;
            for (const item of game.items) {
                total += item.price;
                const when = item.priceObservedOn ? `seen ${item.priceObservedOn}` : 'representative';
                console.log(`  ${item.store.padEnd(11)} £${item.price.toFixed(2).padStart(6)}  ${(item.quantity ?? '').padEnd(10)} ${item.description.slice(0, 46).padEnd(46)} ${when}`);
            }
            console.log(`  ${''.padEnd(11)} £${total.toFixed(2).padStart(6)}  TOTAL`);
            return;
        }

        throw new Error(`unknown command "${command}"; expected generate, publish, mirror, check or show`);
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(String(error instanceof Error ? error.message : error));
    process.exitCode = 1;
});
