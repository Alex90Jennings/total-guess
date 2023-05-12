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

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [guess, setGuess] = useState(undefined);

  const handleCloseModal = () => setShowModal(false);

  return (
        <div>
            <div className="app">
                <Header isAuthenticated={isAuthenticated} />
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={
                            <LandingPage
                                isAuthenticated={isAuthenticated}
                                setIsAuthenticated={setIsAuthenticated}
                                setShowModal={setShowModal}
                            />
                            }
                        />
                        <Route path="/play" element={<MainGamePage setGuess={setGuess} />} />
                        <Route path="/results" element={<Results guess={guess} />} />
                        <Route path="/share" element={<Share />} />
                    </Routes>
                </BrowserRouter>
                {
                    showModal && (
                        <Modal
                            className={"modal"}
                            isOpen={showModal}
                            onRequestClose={handleCloseModal}
                        >
                            <GameInstructions onClose={handleCloseModal} />
                        </Modal>
                    )
                }
                <Footer />
            </div>
            <ContactUs />
        </div>
    );
}

export default App;
