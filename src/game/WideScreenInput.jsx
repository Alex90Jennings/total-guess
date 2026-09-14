import React from 'react';

const WideScreenInput = ({ currentShopIndex, gameLength, inputValue, setInputValue, cumulativeTotal, decrementItemIndex, handleItemWorthSubmit }) => {

    const handleInputChange = (event) => {
        let inputValue = event?.target?.value || event;

        if(inputValue?.nativeEvent?.inputType === "deleteContentBackward") {
            if(inputValue.length > 0) setInputValue(inputValue.slice(0, -1))
            return
        }

        inputValue = inputValue.replace(/[^0-9.]/g, '');

        if(Number(inputValue) > 99.99 || Number(inputValue).toString().split('.')[1]?.length > 2) return

        if (!inputValue.startsWith('£')) inputValue = '£' + inputValue;

        setInputValue(inputValue);
    };

    const lastItem = currentShopIndex === gameLength - 1;

    return (
        <div className="play-entry">
            <label className="play-entry__label" htmlFor="guess-input">Your guess</label>
            <input
                id="guess-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(event) => {if(event.key === 'Enter') {handleItemWorthSubmit()}}}
                placeholder="£0.00"
                className="play-entry__input"
            />
            <p className="play-readout__subtotal">
                Basket so far <strong>£{cumulativeTotal.toFixed(2)}</strong>
                <span className="play-entry__hint">Press Enter ↵</span>
            </p>
            <div className="play-actions">
                <button
                    type="button"
                    className="play-button play-button--ghost"
                    disabled={currentShopIndex === 0}
                    onClick={() => decrementItemIndex()}
                >
                    Back
                </button>
                <button
                    type="button"
                    className={`play-button ${lastItem ? 'play-button--finish' : 'play-button--primary'}`}
                    onClick={() => handleItemWorthSubmit()}
                >
                    {lastItem ? 'Finish basket' : 'Next item →'}
                </button>
            </div>
        </div>
    );
};

export default WideScreenInput;
