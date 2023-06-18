/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useState, useEffect } from "react";
import GameInstructions from "./GameInstructions";
import Modal from "react-modal";
import "../styles/modal.css";
import "../styles/landingPage.css";
import "../styles/game.css";
import { AppContext } from "../hooks/context";
import StatisticsModal from "./StatisticsModal";

function Header({
    setShowLoginPage,
    onClose,
    showModal,
    setShowModal,
}) {
    const { loggedInUser, isAuthenticated, setHideHeaders } = useContext(
        AppContext
    );
    const firstName = loggedInUser.firstName || " ";
    const [audio] = useState(new Audio("/Sounds/click.wav"));
    const [showStatisticsModal, setShowStatisticsModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleDropDownClick = (event) => {
        event.stopPropagation();
        audio.play();
        setShowDropdown((prevState) => !prevState);
    };

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
        setHideHeaders(true);
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

    useEffect(() => {
        const closeMenu = () => {
            setShowDropdown(false);
        };
        if (showDropdown) {
            window.addEventListener('click', closeMenu);
        }
        return () => {
            window.removeEventListener('click', closeMenu);
        };
    }, [showDropdown]);

    return (
        <header id="header">
            <div className="header-left">
                {
                    !isAuthenticated ? (
                    <>
                        <div className="signup" onClick={handleSignUpClick}>
                            Sign up
                        </div>
                        <div className="signin">
                            Sign in
                        </div>
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
                onClick={handleDropDownClick}
            />
            {showDropdown && (
                <div className="dropdown-menu">
                {!isAuthenticated ? (
                    <>
                    <div className="dropdown-item" onClick={handleSignUpClick}>
                        Sign up
                    </div>
                    <div className="dropdown-item">
                        Sign in
                    </div>
                    </>
                ) : (
                    <>
                    <div className="dropdown-item">
                        Sign out
                    </div>
                    </>
                )}
                <div className="dropdown-item" onClick={handleStatisticsClick}>
                    Statistics
                </div>
                <div className="dropdown-item" onClick={handleImageClick}>
                    Instructions
                </div>
                <div className="dropdown-item">About Us</div>
                <div className="dropdown-item">FAQs</div>
                <div className="dropdown-item">Advertise With Us</div>
                </div>
            )}
            </div>
            <StatisticsModal
                isOpen={showStatisticsModal}
                onClose={handleCloseStatisticsModal}
            />
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
