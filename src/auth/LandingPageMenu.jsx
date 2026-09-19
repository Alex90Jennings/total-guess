/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect } from 'react';
import { useDayRollover } from '../hooks/useDayRollover';
import VerifyBanner from './VerifyBanner';
import { useNavigate } from 'react-router-dom';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import TimerToUkMidnight from '../game/TimerToUkMidnight';
import { isoDate } from '../data/dailyGame';
import { hasPlayed } from '../api/stats';

function LandingPageMenu({ setElementToDisplay, setFormData, formData }) {

    const { isAuthenticated, loggedInUser, handleSignOut, selectedGameMode, stats } = useContext(AppContext);

    // A tab left open overnight should show the new day's game, not yesterday's countdown.
    useDayRollover();
    const [ hasPlayedDaily, setHasPlayedDaily ] = useState(false)
    const navigate = useNavigate();

    const playAsGuest = () => {
        navigate('/play')
    }

    // One game a day, for everyone: the day rolls over at midnight UTC.
    useEffect(
        () => {
            setHasPlayedDaily(hasPlayed(stats, isoDate()));
        },
        [stats?.gamesPlayed],
    );

    const handleStartGameSubmit = () => {
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
        <>
            <VerifyBanner user={loggedInUser} />
        <div id='landing-page-menu'>
            <div/>
            <ul className='list-reset pl-none'>
                {
                    selectedGameMode === 'groceries' ?
                        hasPlayedDaily ?
                            <>
                                <TimerToUkMidnight />
                                {
                                    // A guest who has already played can still register, and today's game carries across.
                                    !loggedInUser && (
                                        <li className='three-columns-expand-one-three'>
                                            <div/>
                                            <button className='play-button-styling three-rows-expand-one-three' onClick={handleShowRegistrationForm}>
                                                <div/>
                                                <div>Register</div>
                                                <div/>
                                            </button>
                                            <div/>
                                        </li>
                                    )
                                }
                            </>
                            :
                            <li className='three-columns-expand-one-three'>
                                <div/>
                                {
                                    loggedInUser ? (
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
                        loggedInUser ?
                            <button className='signin-button-styling three-rows-expand-one-three' onClick={() => handleSignOut()}>
                                <div/>
                                <div>Sign Out</div>
                                <div/>
                            </button> :
                            <button className='signin-button-styling three-rows-expand-one-three' onClick={() => {
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
                    !loggedInUser && !hasPlayedDaily && <li className='three-columns-expand-one-three mt-s'>
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
        </>
    );
}

export default LandingPageMenu;

