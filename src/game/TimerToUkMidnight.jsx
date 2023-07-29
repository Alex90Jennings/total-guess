import React, { useState, useEffect } from 'react';

const TimerToUkMidnight = () => {
    
    const [countdown, setCountdown] = useState(null);

    useEffect(
        () => {
            const interval = setInterval(
                () => {
                    const now = new Date();
                    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
                    const timeRemaining = midnight - now;

                    if (timeRemaining <= 0) {
                        clearInterval(interval);
                        setCountdown('00:00:00');
                    } else {
                        const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
                        const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
                        const seconds = Math.floor((timeRemaining / 1000) % 60);

                        setCountdown(
                            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
                                .toString()
                                .padStart(2, '0')}`
                        );
                    }
                }, 1000
            );

        return () => clearInterval(interval);
    }, []);

    return (
        <div className='three-columns-expand-one-three'>
            <div></div>
            <div className='timer-to-midnight'>{countdown}</div>
            <div></div>
        </div>
    );
};

export default TimerToUkMidnight;
