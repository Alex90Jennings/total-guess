import React from 'react';
import '../styles/landingPage.css'

function LandingPageMenu({ setShowLoginPage, setShowModal, setStartGame, setIsAuthenticated, isAuthenticated }) {
    const handleStartGameSubmit = () => {
        if(isAuthenticated) {
            setStartGame(true)
        } else {
            setShowLoginPage(true)
        }
    }

    const handlePracticeGameSubmit = () => {
        setIsAuthenticated(true)
        setStartGame(true)
    }

    return (
        <div id='landing-page-menu'>
            <div></div>
            <ul className='list-reset pl-none'>
                <li className='three-columns-expand-one-three mb-m'>
                    <div></div>
                    <button className='landing-page-menu-btn play-btn' onClick={handleStartGameSubmit}>Play</button>
                    <div></div>
                </li>
                <li className='three-columns-expand-one-three mb-m'>
                    <div></div>
                    <button className='landing-page-menu-btn play-btn' onClick={handlePracticeGameSubmit}>Practice</button>
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
