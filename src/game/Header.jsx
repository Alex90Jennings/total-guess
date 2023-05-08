import React from "react";
import Instructions from "../game/Instructions";
import { useState } from "react";
import Modal from "react-modal";
import "../styles/modal.css";
import "../styles/landingPage.css"
import "../styles/game.css"

function Header({ isAuthenticated, firstName, setShowLoginPage, setHideHeaders }) {
  const [showModal, setShowModal] = useState(false);

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
        {!isAuthenticated ? (
          <>
            <div className="signup" onClick={handleSignUpClick}>Sign up</div>
            <div className="signin">Sign in</div>
          </>
        ) : (
          <>
            <img src="/icons/userwhite.svg" alt="User icon" />
            <div className="users-first-name">{firstName}</div>
          </>
        )}
      </div>
      <div className="header-middle logo">
          Total🤷‍♂️GuEss
      </div>
      <div className="header-right">
        <div>
          <div className="icon1">
            <div>
              <img
                src={"/icons/iicon.svg"}
                alt="i icon"
                height="80px"
                width="80px"
                onClick={handleImageClick}
              />
            </div>
          </div>
          {showModal && (
            <Modal
              className={"modal"}
              isOpen={showModal}
              onRequestClose={handleCloseModal}
            >
              <Instructions onClose={handleCloseModal} />
            </Modal>
          )}
        </div>
        <div className="icon2">
          <div>
            <img
              src={"/icons/settingsicon.svg"}
              alt="settings icon"
              height="80px"
              width="80px"
            />
          </div>
        </div>
        <div className="icon3">
          <div>
            <img
              src={"/icons/statisticsicon.svg"}
              alt="fav icon"
              height="50px"
              width="50px"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
