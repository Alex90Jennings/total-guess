/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState } from "react";
import "../styles/modal.css";
import "../styles/landingPage.css";
import "../styles/game.css";
import { AppContext } from "../hooks/context";
import { ModalToDisplay } from "../App";

function Header({ setShowLoginPage }) {
    const { loggedInUser, isAuthenticated, setModalToDisplay } = useContext(AppContext);
    const firstName = loggedInUser.firstName || " ";
    const [audio] = useState(new Audio("/Sounds/click.wav"));

    const handleStatisticsImageClick = () => {
        audio.play();
        setModalToDisplay(ModalToDisplay.STATISTICS);
    };

    const handleInstructionsImageClick = () => {
        audio.play();
        setModalToDisplay(ModalToDisplay.INSTRUCTIONS);
    };

    //const playSound = () => {
    //    audio.play().catch((error) => console.log(error));
    //};

    const handleSignUpClick = () => {
        audio.play();
        setShowLoginPage(true);
    };

    //const handleCloseStatisticsModal = () => {
    //    audio.play();
    //    setShowStatisticsModal(false);
    //}; 

    //useEffect(() => {
    //    if (!showModal) {
    //    audio.play();
    //    }
    //S}, [showModal]);

    return (
        <header id="header">
            <div className="header-left">
                {
                    !isAuthenticated ? (
                        <>
                            <div className="signup" onClick={handleSignUpClick}>Sign up</div>
                            <div className="signin">Sign in</div>
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
                    onClick={() => handleInstructionsImageClick()}
                />
                <img
                    src={"/icons/statsnew.svg"}
                    alt="stats icon"
                    className="stats-icon"
                    onClick={() => handleStatisticsImageClick()}
                />
            </div>
            <div className="header-right-narrow-screen">
                <img
                    src={"/icons/dropdown.png"}
                    alt="dropdown"
                    className="mr-m dropdown-icon"
                />
            </div>
        </header>
    );
}

export default Header;