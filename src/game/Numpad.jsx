import React from 'react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

const Numpad = ({ inputValue, setInputValue, lastItem, firstItem, decrementItemIndex, handleItemWorthSubmit }) => {

    const handleNumPadPress = (num) => {
        if(num === '⌫') {
            if(inputValue.length > 0) setInputValue(inputValue.slice(0, -1))
            return
        }

        if(inputValue && inputValue.includes('.') && inputValue.split('.')[1].length >= 2) return

        let newNumber = `${inputValue}${num}`

        if(Number(newNumber) > 99.99) return

        if (!newNumber.startsWith('£')) {
            newNumber = '£' + newNumber;
        }

        const numericValue = parseFloat(newNumber.substring(1));

        if (!isNaN(numericValue) && numericValue > 99) {
            newNumber = inputValue;
        }

        setInputValue(newNumber);
    };

    return (
        <div className="play-keypad">
            <div className="play-keypad__keys">
                {KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        className={`play-key ${key === '⌫' || key === '.' ? 'play-key--muted' : ''}`}
                        aria-label={key === '⌫' ? 'Delete' : key}
                        onClick={() => handleNumPadPress(key)}
                    >
                        {key}
                    </button>
                ))}
            </div>
            <div className="play-actions">
                <button
                    type="button"
                    className="play-button play-button--ghost"
                    disabled={firstItem}
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

export default Numpad;
