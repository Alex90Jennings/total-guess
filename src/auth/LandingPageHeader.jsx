import React from 'react';
import '../styles/landingPage.css'

function LandingPageHeader({hideHeaders}) {
    return (
        <div id='login-header'>
            <div className='three-columns-expand-one-three'>
                <div></div>
                <img className='center-wrapper' src="/icons/trolley.svg" alt="basket" />
                <div></div>
            </div>
            {
                !hideHeaders && (
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <h1>CANTAB</h1>
                        <div></div>
                    </div>
                )
            }
            {
                !hideHeaders && (
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <h2>Guess the total cost of the groceries</h2>
                        <div></div>
                    </div>
                )
            }
        </div>
    );
}

export default LandingPageHeader;