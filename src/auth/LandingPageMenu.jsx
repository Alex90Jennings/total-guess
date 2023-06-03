/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import GameInstructions from '../game/GameInstructions';
import TimerToUkMidnight from '../game/TimerToUkMidnight';

function LandingPageMenu({ setShowLoginPage, setShowLandingPageContent, setShowModal, onClose }) {

    const { isAuthenticated } = useContext(AppContext);
    const hasPlayedDaily = true //TODO! replace with user.hasPlayedDaily
    const navigate = useNavigate();
    const [showModal, setModalState] = useState(false); 
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const playSound = () => {
        audio.play()
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

    useEffect(() => {
        if (!showModal) {
            audio.play();
        }
    }, [showModal]);

    return (
        <div id='landing-page-menu'>
            <div></div>
            <ul className='list-reset pl-none'>
                {
                    hasPlayedDaily ? 
                        <TimerToUkMidnight />
                        :
                        <li className='three-columns-expand-one-three'>
                            <div></div>
                            <button className='landing-page-menu-btn play-btn' onClick={handleStartGameSubmit}>Play</button>
                            <div></div>
                        </li>
                }
                {/*
                <li className='three-columns-expand-one-three'>
                    <div></div>
                    <button className='landing-page-menu-btn play-btn' onClick={handlePracticeGameSubmit}>Practice</button>
                    <div></div>
                </li>
                */}
                {/* <li className='three-columns-expand-one-three'>
                    <div></div>
                    <button className='landing-page-menu-btn other-btn' onClick={handleModalOpen}>Instructions</button>
                    <div></div>
                </li> */}
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
                <GameInstructions onClose={handleCloseModal} playSound={playSound} />
            )}
        </div>
    );
}

export default LandingPageMenu;

