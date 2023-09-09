import React from 'react';

const WideScreenInput = ({ currentShopIndex, gameLength, inputValue, setInputValue, cumulativeTotal, decrementItemIndex, handleItemWorthSubmit }) => {

    const handleInputChange = (event) => {
        let inputValue = event?.target?.value || event;

        if(inputValue === '⌫') {
            if(inputValue.length > 0) setInputValue(inputValue.slice(0, -1))
            return
        }

        inputValue = inputValue.replace(/[^0-9.]/g, '');
    
        if (!inputValue.startsWith('£')) {
            inputValue = '£' + inputValue;
        }
    
        const numericValue = parseFloat(inputValue.substring(1));
    
        if (!isNaN(numericValue) && numericValue > 99) {
            return;
        }

        setInputValue(inputValue);
    };

    return (
        <div>
            <p className='item-count'><span className='item-count-accent'>{currentShopIndex + 1}</span>/{gameLength}</p>
            <p className='sub-total'>Sub Total: £{cumulativeTotal.toFixed(2)}</p>
            <div className="input-container mt-s">
                <div></div>
                <div className='five-columns-expand-two-four'>
                    <button id='back-item-button' disabled={currentShopIndex === 0} onClick={() => decrementItemIndex()}>Back</button>
                    <div></div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={(event) => {if(event.key === 'Enter') {handleItemWorthSubmit()}}}
                        placeholder="Enter £ value"
                        className='value-input'
                    />
                    <div></div>
                    <button id={currentShopIndex === gameLength - 1 ? 'submit-final-item-button' : 'submit-item-button'} onClick={() => handleItemWorthSubmit()}>Submit</button>
                </div>
            </div>
        </div>
    );
};

export default WideScreenInput;
