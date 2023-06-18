/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState } from "react";
import "../styles/modal.css";
import "../styles/landingPage.css";
import "../styles/game.css";
import { AppContext } from "../hooks/context";
import { ModalToDisplay } from "../App";

function Header({ setShowLoginPage }) {

    const { loggedInUser, isAuthenticated, setModalToDisplay, handleSignOut } = useContext(AppContext);
    const firstName = loggedInUser.firstName || " ";
    const [audio] = useState(new Audio("/Sounds/click.wav"));
    const [showDropdown, setShowDropdown] = useState(false);

    const handleDropDownClick = () => {
        audio.play();
        setShowDropdown(!showDropdown)
    };

    //TODO: this won't work unless the current page is /
    const handleSignUpClick = () => {
        audio.play();
        setShowLoginPage(true);
    };


    return (
        <header id="header">
            <div className="header-left">
                {
                    !isAuthenticated ? (
                        <>
                            <div className="signup" onClick={() => handleSignUpClick()}>Sign up</div>
                            <div className="signin" onClick={() => handleSignUpClick()}>Sign in</div>
                        </>
                    ) : (
                        <>
                            <img src="/icons/userwhite.svg" alt="User icon" />
                            <div className="users-first-name">{firstName}</div>
                        </>
                    )
                }
            </div>
            <div className="header-middle logo">Total🤷‍♂️GuEss</div>
            <div className="header-right header-right-wide-screen">
                <img
                    src={"/icons/instructionsnew.svg"}
                    alt="i icon"
                    className="icon"
                    onClick={() => setModalToDisplay(ModalToDisplay.INSTRUCTIONS)}
                />
                <img
                    src={"/icons/statsnew.svg"}
                    alt="stats icon"
                    className="stats-icon"
                    onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}
                />
            </div>
            <div className="header-right-narrow-screen">
                <img
                    src={"/icons/dropdown.png"}
                    alt="dropdown"
                    className="mr-m dropdown-icon"
                    onClick={() => handleDropDownClick()}
                />
                {
                    showDropdown && (
                        <div className="dropdown-menu">
                            {
                                !isAuthenticated ? (
                                    <>
                                        <div className="dropdown-item" onClick={handleSignUpClick}>
                                            Sign up
                                        </div>
                                        <div className="dropdown-item">
                                            Sign in
                                        </div>
                                    </>
                                ) : (
                                    <div className="dropdown-item" onClick={() => handleSignOut()}>
                                        Sign out
                                    </div>
                                )
                            }     
                            <div className="dropdown-item" onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>
                                Statistics
                            </div>
                            <div className="dropdown-item" onClick={() => setModalToDisplay(ModalToDisplay.INSTRUCTIONS)}>
                                Instructions
                            </div>
                            <div className="dropdown-item" onClick={() => setModalToDisplay(ModalToDisplay.ABOUT_US)}>About Us</div>
                            <div className="dropdown-item" onClick={() => setModalToDisplay(ModalToDisplay.FAQ)}>FAQs</div>
                            <div className="dropdown-item" onClick={() => setModalToDisplay(ModalToDisplay.ADVERTISE)}>Advertise With Us</div>
                        </div>
                    )
                }
            </div>
        </header>
    );
}

export default Header;
