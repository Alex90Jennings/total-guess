import { useEffect } from 'react';
import { isoDate } from '../data/dailyGame';

/**
 * Notices when the game day rolls over at midnight UTC.
 *
 * A tab left open overnight keeps whatever it worked out when it loaded: a
 * countdown that has run to zero, yesterday's basket, and a "come back
 * tomorrow" that is now wrong. Nothing prompts it to think again, because
 * nothing has changed from the page's point of view.
 *
 * So the date is checked on a timer and whenever the tab is looked at again —
 * a tab that has been in the background for eight hours gets no ticks worth
 * having, but it does get a visibility event the moment somebody returns to it.
 *
 * Deliberately not used while a basket is being played: a reload mid-game
 * would throw away the guesses somebody has already made, and their result is
 * recorded against the day they started.
 */
export function useDayRollover(onRollover = () => window.location.reload()) {
    useEffect(() => {
        const startedOn = isoDate();

        const check = () => {
            if (isoDate() !== startedOn) onRollover();
        };

        const interval = setInterval(check, 20000);
        document.addEventListener('visibilitychange', check);
        window.addEventListener('focus', check);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', check);
            window.removeEventListener('focus', check);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
