import { useContext, useEffect } from "react";
import { Route, Routes, BrowserRouter, Navigate } from "react-router-dom";
import "./styles/App.css";
import "./styles/modal.css";
import LandingPage from "./auth/LandingPage.jsx";
import MainGamePage from "./game/MainGamePage.jsx";
import GameInstructions from "./game/GameInstructions";
import Modal from "react-modal";
import Header from "./game/Header";
import Footer from "./game/Footer";
import Results from "./game/Results";
import StatisticsModal from "./Modals/StatisticsModal.jsx";
import AboutUs from "./Modals/AboutUs.jsx";
import FAQ from "./Modals/FAQ.jsx";
import Advertise from "./Modals/Advertise.jsx";
import BreakdownModal from "./Modals/BreakdownModal.jsx";
import AlreadyPlayed from "./Modals/AlreadyPlayed.jsx";
import NotSignedIn from "./Modals/NotSignedIn.jsx"
import { AppContext } from "./hooks/context";
import Badges from "./Modals/BadgesModal.jsx";
import Privacy from "./Modals/Privacy.jsx";
import LoggedOut from "./Modals/LoggedOut.jsx";

export const ModalToDisplay = {
    INSTRUCTIONS: "INSTRUCTIONS",
    FAQ: "FAQ",
    STATISTICS: "STATISTICS",
    BREAKDOWN: "BREAKDOWN",
    ABOUT_US: "ABOUT_US",
    ADVERTISE: "ADVERTISE",
    BADGES: "BADGES",
    ALREADY_PLAYED: "ALREADY_PLAYED",
    NOT_SIGNED_IN: "NOT_SIGNED_IN",
    PRIVACY: "PRIVACY",
    LOGGED_OUT: "LOGGED_OUT"
};

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
                <Route path="*" element={<Navigate to="/" />} />
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
            {modal === ModalToDisplay.BADGES && (
                <Badges onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.ALREADY_PLAYED && (
                <AlreadyPlayed onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.NOT_SIGNED_IN && (
                <NotSignedIn onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.PRIVACY && (
                <Privacy onClose={() => setModalToDisplay("")} />
            )}
            {modal === ModalToDisplay.LOGGED_OUT && (
                <LoggedOut onClose={() => setModalToDisplay("")} />
            )}
            </Modal>
        ))}
        <Footer />
    </div>
  );
}

export default App;
