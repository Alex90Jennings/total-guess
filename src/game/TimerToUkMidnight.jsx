import React, { useState, useEffect } from 'react';

/** The next midnight UTC, which is when the day's game changes. */
export function nextMidnightUtc(from = new Date()) {
    return Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 1);
}

/**
 * How long until the next basket.
 *
 * The target is worked out once, on mount, and counted down to. Recomputing it
 * every tick meant that the first tick after midnight measured the distance to
 * the *following* midnight, so a tab left open rolled from 00:00:01 straight
 * back to 23:59:59 and told somebody they had already played a game that had
 * only just started.
 *
 * Reaching zero is also the moment the page around this is out of date, so it
 * says so rather than waiting to be asked. useDayRollover still watches as
 * well: a backgrounded tab gets no ticks worth having, and a laptop asleep
 * through midnight wakes with no ticks at all.
 */
const TimerToUkMidnight = ({ onElapsed }) => {
    // Same shape as the real value, so the layout does not shift when it loads.
    const [countdown, setCountdown] = useState('--:--:--');

    useEffect(() => {
        const target = nextMidnightUtc();
        let finished = false;

        const tick = () => {
            const remaining = target - Date.now();

            if (remaining <= 0) {
                setCountdown('00:00:00');
                if (!finished) {
                    finished = true;
                    onElapsed?.();
                }
                return;
            }

            const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);

            setCountdown(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
                    .toString()
                    .padStart(2, '0')}`
            );
        };

        // Run once straight away rather than waiting a second for the first tick.
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <section className='three-columns-expand-one-three'>
            <div/>
            <p className='timer-to-midnight'>{countdown}</p>
            <div/>
        </section>
    );
};

export default TimerToUkMidnight;
