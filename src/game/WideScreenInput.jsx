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

    return (
        <section className="input-container mt-s">
            <div/>
            <div className='five-columns-expand-two-four'>
                <div className='three-rows-expand-one-three'>
                    <div/>
                    <button id='back-item-button' disabled={currentShopIndex === 0} onClick={() => decrementItemIndex()}>Back</button>
                    <div/>
                </div>
                <div/>
                <div className='three-columns-fr'>
                    <div style={{ textAlign: 'center' }}>
                        <p className='input-container-accent'>Progress</p>
                        <div style={{height: '45px', margin: '0'}} className='three-rows-expand-one-three'>
                            <div/>
                            <p>{currentShopIndex + 1}/{gameLength}</p>
                            <div/>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p className='input-container-accent'>Guess</p>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={(event) => {if(event.key === 'Enter') {handleItemWorthSubmit()}}}
                            placeholder="Enter £ value"
                            className='value-input'
                        />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p className='input-container-accent'>Sub Total</p>
                        <div style={{height: '45px', margin: '0'}} className='three-rows-expand-one-three'>
                            <div/>
                            <p>£{cumulativeTotal.toFixed(2)}</p>
                            <div/>
                        </div>
                    </div>
                </div>
                <div/>
                <div className='three-rows-expand-one-three'>
                    <div/>
                    <button id={currentShopIndex === gameLength - 1 ? 'submit-final-item-button' : 'submit-item-button'} onClick={() => handleItemWorthSubmit()}>Submit</button>
                    <div/>
                </div>
            </div>
        </section>
    );
};

export default WideScreenInput;
