/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState } from "react";
import GameInstructions from "./GameInstructions";
import { useEffect } from "react";
import Modal from "react-modal";
import "../styles/modal.css";
import "../styles/landingPage.css";
import "../styles/game.css";
import { AppContext } from "../hooks/context";

function Header({
    setShowLoginPage,
    onClose,
    showModal,
    setShowModal,
    setShowStatisticsModal
}) {
    const { loggedInUser, isAuthenticated } = useContext(
        AppContext
    );
    const firstName = loggedInUser.firstName || " ";
    const [audio] = useState(new Audio("/Sounds/click.wav"));

    const handleStatisticsClick = () => {
        audio.play();
        setShowStatisticsModal(true);
    };

    const handleCloseModal = () => {
        audio.play();
        onClose();
    };

    const handleImageClick = () => {
        audio.play();
        setShowModal(true);
    };

    const playSound = () => {
        audio.play().catch((error) => console.log(error));
    };

    const handleSignUpClick = () => {
        audio.play();
        setShowLoginPage(true);
    };

    const handleCloseStatisticsModal = () => {
        audio.play();
        setShowStatisticsModal(false);
    }; 

    useEffect(() => {
        if (!showModal) {
        audio.play();
        }
    }, [showModal]);

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
                    onClick={handleImageClick}
                />
                <img
                    src={"/icons/statsnew.svg"}
                    alt="stats icon"
                    className="stats-icon"
                    onClick={handleStatisticsClick}
                />
            </div>
            <div className="header-right-narrow-screen">
                <img
                    src={"/icons/dropdown.png"}
                    alt="dropdown"
                    className="mr-m dropdown-icon"
                />
            </div>
            {showModal && (
                <Modal
                    className={"modal"}
                    isOpen={showModal}
                    onRequestClose={handleCloseModal}
                >
                <GameInstructions onClose={handleCloseModal} playSound={playSound} />
                </Modal>
            )}
        </header>
    );
}

export default Header;