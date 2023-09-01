/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState } from 'react';
import '../styles/modal.css';
import '../styles/landingPage.css';
import '../styles/game.css';
import { AppContext } from '../hooks/context';
import { ModalToDisplay } from '../App';
import { useNavigate } from 'react-router-dom';

function Header({ setShowLoginPage }) {
    const { loggedInUser, isAuthenticated, setModalToDisplay, handleSignOut, isMuted, setIsMuted } = useContext(AppContext);
    const navigate = useNavigate();
    const [audio] = useState(new Audio('/Sounds/click.wav'));
    const [showDropdown, setShowDropdown] = useState(false);

    const handleSignInClick = () => {
        if (!isMuted) audio.play();
        setShowLoginPage(true);
    };

    const getInitials = () => {
        if (loggedInUser?.firstName && loggedInUser?.lastName) return `${loggedInUser?.firstName.charAt(0)}${loggedInUser?.lastName.charAt(0)}`;
        return '??';
    };

    return (
        <header id="header">
            <div className="header-left header-left-wide-screen">
                <div className="icon-header mr-s" onClick={() => navigate('/')}>
                    <img src={"/icons/thome.png"} alt="home icon" />
                </div>
                <div className='icon-header three-rows-expand-one-three'>
                    <div></div>
                    <div className={loggedInUser?.firstName ? 'user-initials' : 'user-initials hide-text'} onClick={() =>{if(loggedInUser?.firstName) setModalToDisplay(ModalToDisplay.BADGES)}}>
                        {getInitials()}
                    </div>
                    <div></div>
                </div>
            </div>
            <h1 className="header-middle logo">TOTAL GUESS</h1>
            <div className="header-right header-right-wide-screen">
                <div className="icon-header mr-s" onClick={() => setIsMuted(!isMuted)}>
                    <img
                        src={isMuted ? '/icons/tmute.png' : '/icons/tvolume.png'}
                        alt="mute"
                    />
                </div>
                <div className="icon-header mr-s" onClick={() => setModalToDisplay(ModalToDisplay.INSTRUCTIONS)}>
                    <img
                        src={"/icons/ti.png"}
                        alt="i icon"
                    />
                </div>
                <div className="icon-header" onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>
                    <img
                        src={"/icons/tchart64.png"}
                        alt="stats icon"
                    />
                </div>
            </div>
            <div className="header-right header-right-narrow-screen">
                <div className="icon-header mr-s" onClick={() => setIsMuted(!isMuted)}>
                    <img
                        src={isMuted ? '/icons/tmute.png' : '/icons/tvolume.png'}
                        alt="mute"
                    />
                </div>
                <div className="icon-header mr-m"onClick={() => setShowDropdown(!showDropdown)}>
                    <img
                        src={"/icons/tdropdown.png"}
                        alt="dropdown"
                        className="mr-m"
                    />
                </div>
                {showDropdown && (
                    <div className="dropdown-menu">
                        {!isAuthenticated ? (
                            <div className="dropdown-item" onClick={() => {
                                handleSignInClick();
                                setShowDropdown(!showDropdown);
                            }}>
                                Sign in
                            </div>
                        ) : (
                            <div className="dropdown-item" onClick={() => {
                                handleSignOut();
                                navigate('/');
                                setShowDropdown(!showDropdown);
                            }}>
                                Sign out
                            </div>
                        )}
                        <div className="dropdown-item" onClick={() => {
                            setModalToDisplay(ModalToDisplay.STATISTICS);
                            setShowDropdown(!showDropdown);
                        }}>
                            Statistics
                        </div>
                        <div className="dropdown-item" onClick={() => {
                            setModalToDisplay(ModalToDisplay.INSTRUCTIONS);
                            setShowDropdown(!showDropdown);
                        }}>
                            Instructions
                        </div>
                        <div className="dropdown-item" onClick={() => {
                            setModalToDisplay(ModalToDisplay.ABOUT_US);
                            setShowDropdown(!showDropdown);
                        }}>
                            About Us
                        </div>
                        <div className="dropdown-item" onClick={() => {
                            setModalToDisplay(ModalToDisplay.FAQ);
                            setShowDropdown(!showDropdown);
                        }}>
                            FAQs
                        </div>
                        <div className="dropdown-item" onClick={() => {
                            setModalToDisplay(ModalToDisplay.ADVERTISE);
                            setShowDropdown(!showDropdown);
                        }}>
                            Advertise With Us
                        </div>
                        <div className="dropdown-item">
                            totalguessgame@gmail.com
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;
