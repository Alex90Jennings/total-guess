import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';

function LandingPageMenu({ setShowLoginPage, setShowLandingPageContent, setShowModal }) {

    const { isAuthenticated } = useContext(AppContext);
    const navigate = useNavigate();
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const handleStartGameSubmit = () => {
        if (isAuthenticated) {
            navigate('/play');
        } else {
            setShowLandingPageContent(false);
            setShowLoginPage(true);
        }
        audio.play();
    };

    const handlePracticeGameSubmit = () => {
        navigate('/play');
        audio.play();
    };

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
                    <button className='landing-page-menu-btn other-btn' onClick={() => {
                        setShowLandingPageContent(false);
                        setShowLoginPage(true);
                    }}>
                        Sign In
                    </button>
                    <div></div>
                </li>
            </ul>
        </div>
    );
}

export default LandingPageMenu;

