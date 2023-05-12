import React, { useContext } from "react";
import Instructions from "../game/Instructions";
import { useState } from "react";
import Modal from "react-modal";
import "../styles/modal.css";
import "../styles/landingPage.css"
import "../styles/game.css"
import { AppContext } from "../hooks/context";

function Header({ setShowLoginPage }) {

    const { loggedInUser, isAuthenticated, setHideHeaders } = useContext(AppContext);

    const [showModal, setShowModal] = useState(false);
    const firstName = loggedInUser.firstName || ' '

    const handleImageClick = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleSignUpClick = () => {
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
                    src={"/icons/iiconnew.svg"}
                    alt="i icon"
                    className="icon"
                    onClick={handleImageClick}
                />
                <img
                    src={"icons/statsicon.svg"}
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
                    <Instructions onClose={handleCloseModal} />
                    </Modal>
                )
            }
        </header>
    );
}

export default Header;
