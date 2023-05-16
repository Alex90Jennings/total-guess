import React, { useContext } from "react";
import Instructions from "../game/Instructions";
import { useState } from "react";
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
            <div className="header-right">
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
            {
                showModal && (
                    <Modal
                        className={"modal"}
                        isOpen={showModal}
                        onRequestClose={handleCloseModal}
                    >
                    <Instructions onClose={handleCloseModal} playSound={playSound}/>
                    </Modal>
                )
            }
        </header>
    );
}

export default Header;
