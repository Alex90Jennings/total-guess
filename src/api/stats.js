/**
 * Stats storage.
 *
 * Signed in: a single row per player in Appwrite, readable and writable only by
 * that player. Signed out: the same shape in localStorage, so a guest still gets
 * a streak and a distribution, and can carry it across when they register.
 */
import { ID, Permission, Query, Role } from 'appwrite';
import { appwriteConfig, isAppwriteConfigured, tablesDB } from '../lib/appwrite';
import { earnedBadges } from '../data/badges';

const GAMES_KEY = 'tgGamesPlayed';
const SCORES_KEY = 'tgScores';

const table = {
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.statsTableId,
};

function readLocal(key) {
    try {
        const raw = JSON.parse(localStorage.getItem(key));
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

function writeLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private browsing or blocked storage: the game still plays, stats just don't persist.
    }
}

/** Stats held in the browser, used by guests and as the fallback everywhere. */
export function getLocalStats() {
    const gamesPlayed = readLocal(GAMES_KEY);
    const scores = readLocal(SCORES_KEY).map(Number);
    return { gamesPlayed, scores, badges: earnedBadges(gamesPlayed, scores) };
}

export function saveLocalResult(isoDate, score) {
    const gamesPlayed = [...readLocal(GAMES_KEY), isoDate];
    const scores = [...readLocal(SCORES_KEY), score];
    writeLocal(GAMES_KEY, gamesPlayed);
    writeLocal(SCORES_KEY, scores);
    return { gamesPlayed, scores, badges: earnedBadges(gamesPlayed, scores) };
}

export function clearLocalStats() {
    writeLocal(GAMES_KEY, []);
    writeLocal(SCORES_KEY, []);
}

function toStats(row) {
    const gamesPlayed = row.gamesPlayed ?? [];
    const scores = (row.scores ?? []).map(Number);
    return {
        $id: row.$id,
        userId: row.userId,
        gamesPlayed,
        scores,
        // Derived, not read back from the column: a player who earned nothing
        // before badges existed picks up their backlog here.
        badges: earnedBadges(gamesPlayed, scores),
    };
}

/** The player's row, created on first use. Falls back to local stats if Appwrite is not configured. */
export async function getStats(userId) {
    if (!isAppwriteConfigured || !userId) return getLocalStats();

    const { rows } = await tablesDB.listRows({
        ...table,
        queries: [Query.equal('userId', userId), Query.limit(1)],
    });
    if (rows.length) return toStats(rows[0]);

    const owner = Role.user(userId);
    const local = getLocalStats();
    const row = await tablesDB.createRow({
        ...table,
        rowId: ID.unique(),
        data: {
            userId,
            gamesPlayed: local.gamesPlayed,
            scores: local.scores.map(String),
            badges: earnedBadges(local.gamesPlayed, local.scores),
        },
        permissions: [Permission.read(owner), Permission.update(owner), Permission.delete(owner)],
    });
    clearLocalStats(); // the guest's history has been carried over
    return toStats(row);
}

/** Append today's result. Returns the updated stats. */
export async function saveResult(userId, statsRowId, isoDate, score) {
    if (!isAppwriteConfigured || !userId) return saveLocalResult(isoDate, score);

    const current = statsRowId
        ? toStats(await tablesDB.getRow({ ...table, rowId: statsRowId }))
        : await getStats(userId);

    const gamesPlayed = [...current.gamesPlayed, isoDate];
    const scores = [...current.scores, score];

    const row = await tablesDB.updateRow({
        ...table,
        rowId: current.$id,
        data: {
            gamesPlayed,
            scores: scores.map(String),
            badges: earnedBadges(gamesPlayed, scores),
        },
    });
    return toStats(row);
}

/** Has this player already had their go today? */
export function hasPlayed(stats, isoDate) {
    return Boolean(stats?.gamesPlayed?.includes(isoDate));
}
