import React from 'react';

/** Game number, date and a segmented bar showing how far through the basket you are. */
const DateAndGameNumber = ({ gameNumber, currentShopIndex, gameLength }) => {
    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="play-progress">
            <div className="play-progress__meta">
                <span>Game #{gameNumber} · {today}</span>
                <span>
                    Item <strong>{currentShopIndex + 1}</strong> of {gameLength}
                </span>
            </div>
            <div className="play-progress__bar" role="progressbar" aria-valuemin={1} aria-valuemax={gameLength} aria-valuenow={currentShopIndex + 1}>
                {Array.from({ length: gameLength }, (_, i) => (
                    <span
                        key={i}
                        className={
                            i < currentShopIndex ? 'is-done' : i === currentShopIndex ? 'is-current' : ''
                        }
                    />
                ))}
            </div>
        </div>
    );
};

export default DateAndGameNumber;
