import { useState, useContext, useEffect } from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
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
import AboutUs from './game/AboutUs';
import FAQ from './game/FAQ'
import Advertise from './game/Advertise';
import ContactUsModal from './game/ContactUsModal';
import { AppContext } from './hooks/context';

export const ModalToDisplay = {
    INSTRUCTIONS: 'INSTRUCTIONS',
    FAQ: 'FAQ',
    STATISTICS: 'STATISTICS',
    CONTACT_US: 'CONTACT_US',
    ABOUT_US: 'ABOUT_US',
    ADVERTISE: 'ADVERTISE',
};

function App() {

    const [guess, setGuess] = useState(0);
    const [audio] = useState(new Audio("/Sounds/click.wav"));
    const { modalToDisplay, setModalToDisplay } = useContext(AppContext);

    const playSound = () => {
        audio.play().catch((error) => console.log(error));
    };

    const closeModal = () => {
        playSound()
        setModalToDisplay('');
    };

    useEffect(
        () => {
            Modal.setAppElement("#root");
        }, 
        []
    );

    return (
        <div>
            <div className="app">
                <Header />
                <BrowserRouter>
                    <Routes>
                        <Route
                            path="/"
                            element={<LandingPage />}
                        />
                        <Route
                            path="/play"
                            element={<MainGamePage guess={guess} setGuess={setGuess} />}
                        />
                        <Route path="/results" element={<Results guess={guess} />} />
                        <Route path="/share" element={<Share />} />
                    </Routes>
                </BrowserRouter>
                {
                    Object.values(ModalToDisplay).map(
                        (modal) => (
                            <Modal
                                key={modal}
                                className="modal"
                                isOpen={modalToDisplay === modal}
                                onRequestClose={closeModal}
                            >
                                {
                                    modal === ModalToDisplay.INSTRUCTIONS && (
                                        <GameInstructions onClose={closeModal} />
                                    )
                                }
                                {
                                    modal === ModalToDisplay.STATISTICS && (
                                        <StatisticsModal onClose={closeModal} />
                                    )
                                }
                                {
                                    modal === ModalToDisplay.ABOUT_US && (
                                        <AboutUs onClose={closeModal} playSound={playSound} />
                                    )
                                }
                                {
                                    modal === ModalToDisplay.FAQ && (
                                        <FAQ onClose={closeModal} playSound={playSound} />
                                    )
                                }
                                {
                                    modal === ModalToDisplay.ADVERTISE && (
                                        <Advertise onClose={closeModal} playSound={playSound} />
                                    )
                                }
                                {
                                    modal === ModalToDisplay.CONTACT_US && (
                                        <ContactUsModal onClose={closeModal} playSound={playSound} />
                                    )
                                }
                            </Modal>
                        )
                    )
                }
                <Footer />
            </div>
            <ContactUs />
        </div>
    );
}

export default App;
