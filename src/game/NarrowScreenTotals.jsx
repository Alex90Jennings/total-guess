import React from 'react';

const NarrowScreenTotals = ({ currentShopIndex, gameLength, inputValue, cumulativeTotal }) => {


    return (
        <section className='three-columns-auto'>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent'>Progress</p>
                <p style={{ margin: '0 0 8px 0' }}>{currentShopIndex + 1}/{gameLength}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent'>Guess</p>
                <p style={{ margin: '0 0 8px 0' }}>{inputValue === '' || inputValue === '£' ? '£0.00' : inputValue}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent'>Sub Total</p>
                <p style={{ margin: '0 0 8px 0' }}>£{cumulativeTotal.toFixed(2)}</p>
            </div>
        </section>
    );
};

export default NarrowScreenTotals;
