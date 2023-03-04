import React from 'react';
import '../styles/landingPage.css'

function LandingPageMenu({ setShowLoginPage, setShowModal, setStartGame, isAuthenticated }) {
    const handleStartGameSubmit = () => {
        if(isAuthenticated) {
            setStartGame(true)
        } else {
            setShowLoginPage(true)
        }
    }

    return (
        <div id='landing-page-menu'>
            <div className='three-columns-expand-one-three'>
                <div></div>
                <h2>Guess the total cost of the groceries</h2>
                <div></div>
            </div>
            <ul className='list-reset pl-none'>
                <li className='three-columns-expand-one-three mb-m'>
                    <div></div>
                    <button className='landing-page-menu-btn play-btn' onClick={handleStartGameSubmit}>Play</button>
                    <div></div>
                </li>
                <li className='three-columns-expand-one-three mb-m'>
                    <div></div>
                    <button className='landing-page-menu-btn other-btn' onClick={() => setShowModal(true)}>Instructions</button>
                    <div></div>
                </li>
                <li className='three-columns-expand-one-three'>
                    <div></div>
                    <button className='landing-page-menu-btn other-btn' onClick={() => setShowLoginPage(true)}>Sign In</button>
                    <div></div>
                </li>
            </ul>
        </div>
    );
}

export default LandingPageMenu;
