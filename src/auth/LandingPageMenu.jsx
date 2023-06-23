/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import TimerToUkMidnight from '../game/TimerToUkMidnight';

function LandingPageMenu({ setShowLoginPage, setShowLandingPageContent }) {

    const { isAuthenticated, loggedInUser, setLoggedInUser, isMuted, setIsAuthenticated } = useContext(AppContext);
    const [ hasPlayedDaily, setHasPlayedDaily ] = useState(false)
    const navigate = useNavigate();
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const playSound = () => {
        if(!isMuted) audio.play()
    };

    useEffect(
        () => {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const formattedToday = today.toISOString();
            const isGameAlreadyInArray = loggedInUser?.gamesPlayed?.includes(formattedToday);
            setHasPlayedDaily(isGameAlreadyInArray);
        }, 
        [loggedInUser?.gamesPlayed],
    );

    const handleStartGameSubmit = () => {
        playSound();
        if(hasPlayedDaily) {
            return
        }
        if (isAuthenticated) {
            navigate('/play');
        } else {
            setShowLandingPageContent(false);
            setShowLoginPage(true);
        }
    };

    //const handlePracticeGameSubmit = () => {
    //    playSound();
    //    navigate('/play');
    //};

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
                            <button className='play-button-styling' onClick={handleStartGameSubmit}>Play</button>
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
                    {
                        loggedInUser?._id ?
                            <button className='signin-button-styling' onClick={() => {
                                if(!isMuted) playSound();
                                localStorage.setItem("tgJwtToken", "")
                                setIsAuthenticated(false)
                                setLoggedInUser({});
                            }}>
                                Sign Out
                            </button> :
                            <button className='signin-button-styling' onClick={() => {
                                if(!isMuted)playSound();
                                setShowLandingPageContent(false);
                                setShowLoginPage(true);
                            }}>
                                Sign In
                            </button>
                    }
                    <div></div>
                </li>
            </ul>
        </div>
    );
}

export default LandingPageMenu;

