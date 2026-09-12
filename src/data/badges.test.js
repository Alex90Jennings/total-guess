import { BADGES, bestGuess, earnedBadges, newlyEarned } from './badges';

const games = n => Array.from({ length: n }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`);

describe('bestGuess', () => {
    test('is the closest basket ever played, regardless of direction', () => {
        expect(bestGuess([-30, 12, -4, 20])).toBe(4);
    });

    test('is null before the first game', () => {
        expect(bestGuess([])).toBeNull();
    });

    test('ignores values that are not numbers', () => {
        expect(bestGuess([null, undefined, 'x', NaN, -8])).toBe(8);
    });

    test('reads scores stored as strings, which is how they come back', () => {
        expect(bestGuess(['-15', '3'])).toBe(3);
    });
});

describe('earnedBadges', () => {
    test('nothing before the first game', () => {
        expect(earnedBadges([], [])).toEqual([]);
    });

    test('turning up earns the attendance badges cumulatively', () => {
        expect(earnedBadges(games(1), [20])).toContain('one_game');
        expect(earnedBadges(games(1), [20])).not.toContain('five_game');

        const ten = earnedBadges(games(10), [20]);
        expect(ten).toEqual(expect.arrayContaining(['one_game', 'five_game', 'ten_game']));
        expect(ten).not.toContain('twenty_game');
    });

    test('accuracy badges go by the best basket ever, not the latest', () => {
        const history = earnedBadges(games(3), [30, 0.5, 28]);
        expect(history).toEqual(expect.arrayContaining(['ten_guess', 'five_guess', 'one_guess']));
    });

    test('the thresholds are strict, so exactly 5% does not earn the under-5 badge', () => {
        expect(earnedBadges(games(1), [5])).not.toContain('five_guess');
        expect(earnedBadges(games(1), [4.99])).toContain('five_guess');
    });

    test('a player at the wall earns attendance badges but no accuracy ones', () => {
        const earned = earnedBadges(games(20), [-35, 35, -35]);
        expect(earned).toEqual(expect.arrayContaining(['one_game', 'twenty_game']));
        expect(earned.filter(id => id.endsWith('_guess'))).toEqual([]);
    });

    test('every badge is reachable, and the full set is nine', () => {
        expect(BADGES).toHaveLength(9);
        expect(earnedBadges(games(100), [0]).sort()).toEqual(BADGES.map(b => b.id).sort());
    });

    test('returns badges in display order', () => {
        const earned = earnedBadges(games(100), [0]);
        expect(earned).toEqual(BADGES.map(b => b.id));
    });
});

describe('newlyEarned', () => {
    test('reports only what was just unlocked', () => {
        expect(newlyEarned(['one_game'], ['one_game', 'five_game'])).toEqual(['five_game']);
    });

    test('is empty when nothing changed', () => {
        expect(newlyEarned(['one_game'], ['one_game'])).toEqual([]);
    });

    test('a player whose backlog loads at once gets all of them', () => {
        expect(newlyEarned([], ['one_game', 'five_game'])).toEqual(['one_game', 'five_game']);
    });

    test('never announces a badge twice', () => {
        const after = ['one_game', 'five_game'];
        expect(newlyEarned(after, after)).toEqual([]);
    });
});

describe('the empty-score trap', () => {
    // Number(null) and Number('') are 0, so an unscored game used to read as a
    // perfect basket and award the under-1% badge to someone who never earned it.
    test('a null score does not count as a perfect game', () => {
        expect(bestGuess([null, 20])).toBe(20);
        expect(earnedBadges(games(1), [null, 20])).not.toContain('one_guess');
    });

    test('an empty string does not either', () => {
        expect(bestGuess(['', 18])).toBe(18);
        expect(earnedBadges(games(1), ['', 18])).not.toContain('one_guess');
    });

    test('a genuine zero still earns it', () => {
        expect(bestGuess([0])).toBe(0);
        expect(earnedBadges(games(1), [0])).toContain('one_guess');
    });
});
