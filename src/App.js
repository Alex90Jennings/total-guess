import { Route, Routes, BrowserRouter } from "react-router-dom";
import { useState } from "react";
import "./styles/App.css";
import "./styles/modal.css";
import LandingPage from "./auth/LandingPage.jsx";
import MainGamePage from "./game/MainGamePage.jsx";
import GameInstructions from "./game/GameInstructions";
import Modal from "react-modal";
import Header from "./game/Header";
import Footer from "./game/Footer";
import ContactUs from "./ContactUs";
import Results from "./game/Results";
import Share from "./game/Share.jsx";
import StatisticsModal from "./game/StatisticsModal";

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guess, setGuess] = useState(0);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  const handleCloseModal = () => setShowModal(false);
  const handleCloseStatisticsModal = () => setShowStatisticsModal(false);

  return (
    <div>
      <div className="app">
        <Header
          isAuthenticated={isAuthenticated}
          onClose={handleCloseModal}
          showModal={showModal}
          setShowModal={setShowModal}
          setShowStatisticsModal={setShowStatisticsModal}
        />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <LandingPage
                  isAuthenticated={isAuthenticated}
                  setIsAuthenticated={setIsAuthenticated}
                  setShowModal={setShowModal}
                  setShowStatisticsModal={setShowStatisticsModal}
                  onClose={handleCloseModal}
                  onCloseStatisticsModal={handleCloseStatisticsModal}
                />
              }
            />
            <Route
              path="/play"
              element={<MainGamePage guess={guess} setGuess={setGuess} />}
            />
            <Route path="/results" element={<Results guess={guess} setShowStatisticsModal={setShowStatisticsModal} />} />
            <Route path="/share" element={<Share />} />
          </Routes>
        </BrowserRouter>
        {showModal && (
          <Modal
            className={"modal"}
            isOpen={showModal}
            onRequestClose={handleCloseModal}
          >
            <GameInstructions onClose={handleCloseModal} />
          </Modal>
        )}
        {showStatisticsModal && (
          <Modal
            className={"modal"}
            isOpen={showStatisticsModal}
            onRequestClose={handleCloseStatisticsModal}
          >
            <StatisticsModal onClose={handleCloseStatisticsModal} />
          </Modal>
        )}
        <Footer />
      </div>
      <ContactUs />
    </div>
  );
}

export default App;
