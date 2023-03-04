import React from 'react';
import './landingPage.css'

function LandingPageHeader() {
    return (
        <div>
            <div className='three-columns-expand-one-three'>
                <div></div>
                <img className='center-wrapper' src="/icons/basket.png" alt="basket" />
                <div></div>
            </div>
            <div className='three-columns-expand-one-three'>
                <div></div>
                <h1>CANTAB</h1>
                <div></div>
            </div>
        </div>
    );
}

export default LandingPageHeader;