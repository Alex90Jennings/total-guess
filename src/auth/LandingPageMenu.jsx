import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import Instructions from '../game/Instructions';

function LandingPageMenu({ setShowLoginPage, setShowLandingPageContent, setShowModal, onClose }) {
    const { isAuthenticated } = useContext(AppContext);
    const navigate = useNavigate();
    const [showModal, setModalState] = useState(false); 
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const playSound = () => {
    console.log('Trying to play sound, readyState:', audio.readyState);
    audio.play().then(() => {
        console.log('Sound played successfully');
    }).catch(error => {
        console.log('Error playing sound:', error);
    });
};


    const handleStartGameSubmit = () => {
        playSound();
        if (isAuthenticated) {
            navigate('/play');
        } else {
            setShowLandingPageContent(false);
            setShowLoginPage(true);
        }
    };

    const handlePracticeGameSubmit = () => {
        playSound();
        navigate('/play');
    };

    const handleCloseModal = () => {
    playSound().catch(error => console.log('Error playing sound:', error));
    onClose();
};

    const handleModalOpen = () => {
        playSound();
        setModalState(true); 
        setShowModal(true); 
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
                    <button className='landing-page-menu-btn other-btn' onClick={handleModalOpen}>Instructions</button>
                    <div></div>
                </li>
                <li className='three-columns-expand-one-three'>
                    <div></div>
                    <button className='landing-page-menu-btn other-btn' onClick={() => {
                        playSound();
                        setShowLandingPageContent(false);
                        setShowLoginPage(true);
                    }}>
                        Sign In
                    </button>
                    <div></div>
                </li>
            </ul>
            {showModal && (
                <Instructions onClose={handleCloseModal} playSound={playSound} />
            )}
        </div>
    );
}

export default LandingPageMenu;

