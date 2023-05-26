import React, { useContext } from "react";
import GameInstructions from "./GameInstructions";
import { useState, useEffect } from "react";
import Modal from "react-modal";
import "../styles/modal.css";
import "../styles/landingPage.css"
import "../styles/game.css"
import { AppContext } from "../hooks/context";

function Header({ setShowLoginPage, onClose, showModal, setShowModal }) {

    const { loggedInUser, isAuthenticated, setHideHeaders } = useContext(AppContext);
    const firstName = loggedInUser.firstName || ' '
    const [audio] = useState(new Audio('/Sounds/click.wav'));

    const handleImageClick = () => {
        audio.play();
        setShowModal(true);
    };

    const playSound = () => {
        audio.play().catch(error => console.log(error));
    };

    const handleCloseModal = () => {
        audio.play();
        onClose();
    };

    const handleSignUpClick = () => {
        audio.play();
        setShowLoginPage(true);
        setHideHeaders(true);
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
            <div className="header-middle logo">
                Total🤷‍♂️GuEss
            </div>
            <div className="header-right-wide-screen">
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
                />
            </div>
            <div className="header-right-narrow-screen">
                <img
                    src={"/icons/dropdown.png"}
                    alt="dropdown"
                    className="mr-m dropdown-icon"
                />
            </div>
            {
                showModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showModal}
                        onRequestClose={handleCloseModal}
                    >
                    <GameInstructions onClose={handleCloseModal} playSound={playSound}/>
                    </Modal>
                )
            }
        </header>
    );
}

export default Header;
