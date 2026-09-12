/**
 * Badges.
 *
 * Derived from the player's history rather than counted separately, so they can
 * never drift out of step with gamesPlayed/scores, and anyone who played before
 * badges were awarded picks up their backlog the next time their stats load.
 *
 * The id doubles as the icon name: `five_guess` -> /icons/five-guess.png.
 */

export const BADGES = [
    { id: 'one_game', kind: 'game', threshold: 1, label: '1 game played' },
    { id: 'five_game', kind: 'game', threshold: 5, label: '5 games played' },
    { id: 'ten_game', kind: 'game', threshold: 10, label: '10 games played' },
    { id: 'twenty_game', kind: 'game', threshold: 20, label: '20 games played' },
    { id: 'fifty_game', kind: 'game', threshold: 50, label: '50 games played' },
    { id: 'hundred_game', kind: 'game', threshold: 100, label: '100 games played' },
    { id: 'ten_guess', kind: 'guess', threshold: 10, label: 'Guess under 10%' },
    { id: 'five_guess', kind: 'guess', threshold: 5, label: 'Guess under 5%' },
    { id: 'one_guess', kind: 'guess', threshold: 1, label: 'Guess under 1%' },
];

/** The closest a player has ever been, as a positive percentage. */
export function bestGuess(scores = []) {
    const errors = scores.map(score => Math.abs(Number(score))).filter(n => Number.isFinite(n));
    return errors.length ? Math.min(...errors) : null;
}

/** Every badge the player has qualified for, in display order. */
export function earnedBadges(gamesPlayed = [], scores = []) {
    const played = gamesPlayed.length;
    const best = bestGuess(scores);

    return BADGES.filter(badge => badge.kind === 'game'
        ? played >= badge.threshold
        : best !== null && best < badge.threshold,
    ).map(badge => badge.id);
}

/** Badges in `after` that were not already in `before`. */
export function newlyEarned(before = [], after = []) {
    return after.filter(badge => !before.includes(badge));
}
