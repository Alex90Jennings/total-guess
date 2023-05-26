import React, { useContext, useState } from "react";
import GameInstructions from "./GameInstructions";
import { useEffect } from "react";
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

  return (
    <header id="header">
      <div className="header-left">
        {/* {
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
          } */}
      </div>
      <div className="header-middle logo">Total🤷‍♂️GuEss</div>
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
          onClick={handleStatisticsClick}
        />
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