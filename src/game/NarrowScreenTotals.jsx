import React from 'react';

/** The big price read-out used with the on-screen keypad. */
const NarrowScreenTotals = ({ inputValue, cumulativeTotal }) => {
    const hasValue = inputValue !== '' && inputValue !== '£';

    return (
        <div className="play-readout">
            <p className={`play-readout__guess ${hasValue ? '' : 'is-empty'}`}>
                {hasValue ? inputValue : '£0.00'}
            </p>
            <p className="play-readout__subtotal">
                Basket so far <strong>£{cumulativeTotal.toFixed(2)}</strong>
            </p>
        </div>
    );
};

export default NarrowScreenTotals;
