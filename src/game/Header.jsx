/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState } from "react";
import "../styles/modal.css";
import "../styles/landingPage.css";
import "../styles/game.css";
import { AppContext } from "../hooks/context";
import { ModalToDisplay } from "../App";

function Header({ setShowLoginPage }) {

    const { loggedInUser, isAuthenticated, setModalToDisplay, handleSignOut, isMuted, setIsMuted } = useContext(AppContext);
    const firstName = loggedInUser.firstName || " ";
    const [audio] = useState(new Audio("/Sounds/click.wav"));
    const [showDropdown, setShowDropdown] = useState(false);

    const handleDropDownClick = () => {
        if(!isMuted) audio.play()
        setShowDropdown(!showDropdown)
    };

    //TODO: this won't work unless the current page is /
    const handleSignInClick = () => {
        if(!isMuted) audio.play()
        setShowLoginPage(true);
    };


    return (
        <header id="header">
            <div className="header-left">
                {
                    !isAuthenticated ? (
                        <>
                            <div className="signup" onClick={() => handleSignInClick()}>Sign up</div>
                            <div className="signin" onClick={() => handleSignInClick()}>Sign in</div>
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
                    src={isMuted ? "/icons/volumemute.png" : "/icons/volume.png"}
                    alt="mute"
                    className="icon-mute"
                    onClick={() => setIsMuted(!isMuted)}
                />
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
                <div className="two-columns-expand-one">
                    <img
                        src={isMuted ? "/icons/muted.png" : "/icons/unmuted.png"}
                        alt="mute"
                        className={isMuted ? "mr-m dropdown-icon pd-s" : "mr-m dropdown-icon"}
                        onClick={() => setIsMuted(!isMuted)}
                    />
                    <img
                        src={"/icons/dropdown.png"}
                        alt="dropdown"
                        className="mr-m dropdown-icon ml-xs"
                        onClick={() => handleDropDownClick()}
                    />
                </div>
                {
                    showDropdown && (
                       <div className="dropdown-menu">
    {
        !isAuthenticated ? (
            <div className="dropdown-item" onClick={() =>  { handleSignInClick(); handleDropDownClick(); }}>
                Sign in
            </div>
        ) : (
            <div className="dropdown-item" onClick={() => { handleSignOut(); handleDropDownClick(); }}>
                Sign out
            </div>
        )
    }     
        <div className="dropdown-item" onClick={() => { setModalToDisplay(ModalToDisplay.STATISTICS); handleDropDownClick(); }}>
         Statistics
        </div>
        <div className="dropdown-item" onClick={() => { setModalToDisplay(ModalToDisplay.INSTRUCTIONS); handleDropDownClick(); }}>
            Instructions
        </div>
        <div className="dropdown-item" onClick={() => { setModalToDisplay(ModalToDisplay.ABOUT_US); handleDropDownClick(); }}>
            About Us
        </div>
        <div className="dropdown-item" onClick={() => { setModalToDisplay(ModalToDisplay.FAQ); handleDropDownClick(); }}>
            FAQs
        </div>
        <div className="dropdown-item" onClick={() => { setModalToDisplay(ModalToDisplay.ADVERTISE); handleDropDownClick(); }}>
            Advertise With Us
        </div>
        <div className="dropdown-item">
            totalguessgame@gmail.com
        </div>
</div>
                    )
                }
            </div>
        </header>
    );
}

export default Header;
