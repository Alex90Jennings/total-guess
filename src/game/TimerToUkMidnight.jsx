import React, { useState, useEffect } from 'react';

const TimerToUkMidnight = () => {
    
    // Same shape as the real value, so the layout does not shift when it loads.
    const [countdown, setCountdown] = useState('--:--:--');

    useEffect(
        () => {
            const tick = () => {
                const now = new Date();
                const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
                const timeRemaining = midnight - now;

                if (timeRemaining <= 0) {
                    setCountdown('00:00:00');
                    // Keep ticking: the next midnight is a day away, and the
                    // page around this will be reloading shortly anyway.
                    return true;
                }

                const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
                const seconds = Math.floor((timeRemaining / 1000) % 60);

                setCountdown(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
                        .toString()
                        .padStart(2, '0')}`
                );
                return true;
            };

            // Run once straight away rather than waiting a second for the first tick.
            tick();
            const interval = setInterval(() => {
                if (!tick()) clearInterval(interval);
            }, 1000);

        return () => clearInterval(interval);
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
