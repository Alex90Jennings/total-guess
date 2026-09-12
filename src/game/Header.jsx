/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState, useRef, useEffect } from 'react';
import '../styles/modal.css';
import '../styles/landingPage.css';
import '../styles/game.css';
import { AppContext } from '../hooks/context';
import { ModalToDisplay } from '../App';
import { useNavigate } from 'react-router-dom';
import { splitName } from '../api/auth';

function Header({ setShowLoginPage }) {
    const { loggedInUser, isAuthenticated, setModalToDisplay, handleSignOut } = useContext(AppContext);
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const handleSignInClick = () => {
        setShowLoginPage(true);
    };

    const { firstName, lastName } = splitName(loggedInUser);

    const getInitials = () => {
        if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`;
        if (firstName) return firstName.charAt(0);
        return '??';
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            closeDropdown();
        }
    };

    const dropdownMenuPress = (menuChoice) => {
        setModalToDisplay(menuChoice); 
        setShowDropdown(!showDropdown); 
    }

    useEffect(() => {
        showDropdown ? document.addEventListener('mousedown', handleClickOutside) : document.removeEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    return (
        <header id="header">
            <nav className="header-left header-left-wide-screen">
                <div className="icon-header mr-s cursor" onClick={() => navigate('/')}>
                    <img src={"/icons/thome.png"} alt="home icon" />
                </div>
                <div className='icon-header three-rows-expand-one-three cursor'>
                    <div/>
                    <div className={firstName ? 'user-initials' : 'user-initials hide-text'} onClick={() =>{if(firstName) setModalToDisplay(ModalToDisplay.BADGES)}}>
                        {getInitials()}
                    </div>
                    <div/>
                </div>
            </nav>
            <h1 className="header-middle logo">TOTAL GUESS</h1>
            <nav className="header-right header-right-wide-screen">
                <div className="icon-header mr-s cursor" onClick={() => setModalToDisplay(ModalToDisplay.INSTRUCTIONS)}>
                    <img
                        src={"/icons/ti.png"}
                        alt="i icon"
                    />
                </div>
                <div className="icon-header cursor" onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>
                    <img
                        src={"/icons/tchart64.png"}
                        alt="stats icon"
                    />
                </div>
            </nav>
            <nav className="header-right header-right-narrow-screen">
                <button className="icon-header mr-m cursor" onClick={() => setShowDropdown(!showDropdown)}>
                    <img
                        src={"/icons/tdropdown.png"}
                        alt="dropdown"
                        className="mr-m"
                    />
                </button>
                {showDropdown && (
                    <div ref={dropdownRef} className="dropdown-menu">
                        {!isAuthenticated ? (
                            <div className="dropdown-item" onClick={() => { handleSignInClick(); setShowDropdown(!showDropdown); }}>
                                Sign in
                            </div>
                        ) : (
                            <div className="dropdown-item" onClick={() => { handleSignOut(); navigate('/'); setShowDropdown(!showDropdown); }}>
                                Sign out
                            </div>
                        )}
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.STATISTICS)}}>
                            Statistics
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.BADGES)}}>
                            Badges
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.INSTRUCTIONS)}}>
                            Instructions
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.ABOUT_US)}}>
                            About Us
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.PRIVACY)}}>
                            Privacy
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.FAQ)}}>
                            FAQs
                        </div>
                        <div className="dropdown-item" onClick={() => {dropdownMenuPress(ModalToDisplay.ADVERTISE)}}>
                            Advertise With Us
                        </div>
                        <div className="dropdown-item">
                            totalguessgame@gmail.com
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

export default Header;
