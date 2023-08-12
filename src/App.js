import { useContext, useEffect } from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import "./styles/App.css";
import "./styles/modal.css";
import LandingPage from "./auth/LandingPage.jsx";
import MainGamePage from "./game/MainGamePage.jsx";
import GameInstructions from "./game/GameInstructions";
import Modal from "react-modal";
import Header from "./game/Header";
import Footer from "./game/Footer";
import Results from "./game/Results";
import StatisticsModal from "./game/StatisticsModal";
import AboutUs from "./game/AboutUs";
import FAQ from "./game/FAQ";
import Advertise from "./game/Advertise";
import BreakdownModal from "./game/BreakdownModal";
import { AppContext } from "./hooks/context";

export const ModalToDisplay = {
    INSTRUCTIONS: "INSTRUCTIONS",
    FAQ: "FAQ",
    STATISTICS: "STATISTICS",
    BREAKDOWN: "BREAKDOWN",
    ABOUT_US: "ABOUT_US",
    ADVERTISE: "ADVERTISE",
};

//TODO: S3 bucket setup, new game modes, data

function App() {
    const { modalToDisplay, setModalToDisplay } = useContext(AppContext);

    useEffect(() => {
        Modal.setAppElement("#root");
    }, []);

    const getModalClassName = (modal) => {
            if (modal === ModalToDisplay.STATISTICS) {
                return "modal-stats";
            } else {
                return "modal";
            }
    };

  return (
    <div className="app">
        <BrowserRouter>
            <Header />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                    path="/play"
                    element={<MainGamePage />}
                />
                <Route path="/results" element={<Results />} />
                {/*<Route path="/share" element={<Share />} />*/}
            </Routes>
        </BrowserRouter>
        {Object.values(ModalToDisplay).map((modal) => (
            <Modal
                key={modal}
                className={getModalClassName(modal)}
                isOpen={modalToDisplay === modal}
                onRequestClose={() => setModalToDisplay("")}
            >
            {modal === ModalToDisplay.INSTRUCTIONS && (
                <GameInstructions onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.STATISTICS && (
                <StatisticsModal onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.BREAKDOWN && (
                <BreakdownModal onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.ABOUT_US && (
                <AboutUs onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.FAQ && (
                <FAQ onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.ADVERTISE && (
                <Advertise onClose={() => setModalToDisplay("")} />
            )}
            </Modal>
        ))}
        <Footer />
    </div>
  );
}

export default App;
