import React, { useContext } from 'react';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';

function LandingPageHeader() {

    const { isAuthenticated, hideHeaders } = useContext(AppContext);

    return (
        <div id='login-header'>
        <div className='three-columns-expand-one-three'>
            <div></div>
            {/* <img className='trolley-image' src="/icons/trolley.svg" alt="basket" /> */}
            <img className='trolley-image2' src="/Logo/shruggif.gif" alt="trolley-man" />
            {/* <div className='basket-icon'>🛒</div> */}
            <div></div>
        </div>
        {
            !hideHeaders && (
                <div>
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <div className='logo-landing'>Total-Guess!</div>
                        <div></div>
                    </div>
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <h2>Guess the total cost of the groceries</h2>
                        <div></div>
                    </div>
                </div>
            )
        }
        {/*TODO: what is this for?*/}
        {
            isAuthenticated && (
                <div className='three-columns-expand-one-three'>
                    <div></div>
                    <div></div>
                </div>
            )
        }
        </div>
    );
}

export default LandingPageHeader;


