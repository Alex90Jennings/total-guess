import React from 'react';
import '../styles/landingPage.css';

function LandingPageHeader({ hideHeaders }) {

    return (
        <div id='login-header'>
            <div className='three-columns-expand-one-three trolley-icon'>
                <div></div>
                <img src="/icons/trolleywhite.svg" alt="trolley"/>
                <div></div>
            </div>
            {
                !hideHeaders && (
                    <div>
                        <div className='three-columns-expand-one-three mt-xl'>
                            <div></div>
                            <div className='logo-landing'>TOTAL GUESS</div>
                            <div></div>
                        </div>
                        <div className='three-columns-expand-one-three'>
                            <div></div>
                            <h2 className='landing-h2'>Guess the total cost of the groceries</h2>
                            <div></div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default LandingPageHeader;


