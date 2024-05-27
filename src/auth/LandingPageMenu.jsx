/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import TimerToUkMidnight from '../game/TimerToUkMidnight';

function LandingPageMenu({ setElementToDisplay, setFormData, formData }) {

    const { isAuthenticated, loggedInUser, handleSignOut, isMuted, selectedGameMode } = useContext(AppContext);
    const [ hasPlayedDaily, setHasPlayedDaily ] = useState(false)
    const navigate = useNavigate();
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const playSound = () => {
        if(!isMuted) audio.play()
    };

    const playAsGuest = () => {
        playSound()
        navigate('/play')
    }

    useEffect(
        () => {
            if(loggedInUser?.isAdmin) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setUTCHours(0, 0, 0, 0);
                const formattedTomorrow = tomorrow.toISOString();
                const isGameAlreadyInArray = loggedInUser?.gamesPlayed?.includes(formattedTomorrow);
                setHasPlayedDaily(isGameAlreadyInArray);
            } else {
                if(loggedInUser?._id) {
                    const today = new Date();
                    today.setUTCHours(0, 0, 0, 0);
                    const formattedToday = today.toISOString();
                    const isGameAlreadyInArray = loggedInUser?.gamesPlayed?.includes(formattedToday);
                    setHasPlayedDaily(isGameAlreadyInArray);
                } else {
                    const yesterday = new Date()
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setUTCHours(0, 0, 0, 0);
                    const formattedYesterday = yesterday.toISOString();
                    const gamesPlayed = JSON.parse(localStorage.getItem("tgGamesPlayed")) || [];
                    const isGameAlreadyInArray = gamesPlayed?.includes(formattedYesterday);
                    setHasPlayedDaily(isGameAlreadyInArray);
                }
            }
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
            setElementToDisplay('loginForm');
        }
    };

    const handleShowRegistrationForm = () => {
        setFormData({ ...formData, isRegistered: false })
        setElementToDisplay('loginForm');
    };

    return (
        <div id='landing-page-menu'>
            <div/>
            <ul className='list-reset pl-none'>
                {
                    selectedGameMode === 'groceries' ?
                        hasPlayedDaily && loggedInUser ? 
                            <TimerToUkMidnight />
                            :
                            <li className='three-columns-expand-one-three'>
                                <div/>
                                {
                                    loggedInUser?._id ? (
                                        <button className='play-button-styling three-rows-expand-one-three' onClick={handleStartGameSubmit}>
                                            <div/>
                                            <div>Play</div>
                                            <div/>
                                        </button>
                                    ) : (
                                        <button className='play-button-styling three-rows-expand-one-three' onClick={handleShowRegistrationForm}>
                                            <div/>
                                            <div>Register</div>
                                            <div/>
                                        </button>
                                    )
                                }
                                <div/>
                            </li> :
                        <div className='three-columns-expand-one-three'>
                            <div/>
                            <p className='coming-soon-text'>COMING SOON</p>
                            <div/>
                        </div>
                }
                <li className='three-columns-expand-one-three mt-s'>
                    <div/>
                    {
                        loggedInUser?._id ?
                            <button className='signin-button-styling three-rows-expand-one-three' onClick={() => handleSignOut()}>
                                <div/>
                                <div>Sign Out</div>
                                <div/>
                            </button> :
                            <button className='signin-button-styling three-rows-expand-one-three' onClick={() => {
                                if(!isMuted)playSound();
                                setFormData({ ...formData, isRegistered: true })
                                setElementToDisplay('loginForm');
                            }}>
                                <div/>
                                <div>Sign In</div>
                                <div/>
                            </button>
                    }
                </li>
                {
                    !loggedInUser._id && !hasPlayedDaily && <li className='three-columns-expand-one-three mt-s'>
                        <div/>
                        <button className='play-button-styling three-rows-expand-one-three' onClick={() => playAsGuest()}>
                            <div/>
                            <div>Play As Guest</div>
                            <div/>
                        </button>
                        <div/>
                    </li>
                }
            </ul>
        </div>
    );
}

export default LandingPageMenu;

