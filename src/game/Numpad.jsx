import React from 'react';

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
        <section className='num-pad-container'>
            <div></div>
            <div className="num-pad">
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('7')}>7</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('8')}>8</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('9')}>9</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('4')}>4</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('5')}>5</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('6')}>6</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('1')}>1</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('2')}>2</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('3')}>3</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('.')}>.</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('0')}>0</button>
                <button className='num-pad-button' id='9' onClick={() => handleNumPadPress('⌫')}>del</button>
                <button 
                    id='enter'
                    className={lastItem ? 'narrow-submit-final-item-button' : 'narrow-submit-item-button'} 
                    onClick={() => handleItemWorthSubmit()}
                >
                    <div></div>
                    <img src={`${lastItem ? '/icons/enter-accent.png' : '/icons/enter.png'}`} alt="enter" className='enter-icon' />
                    <div></div>
                </button>
                <button 
                    id='back' 
                    className='narrow-back-item-button'
                    disabled={firstItem} 
                    onClick={() => decrementItemIndex()}
                >
                    BACK
                </button>
            </div>
            <div></div>
        </section>
    );
};

export default Numpad;
