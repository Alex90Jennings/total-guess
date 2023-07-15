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
import BreakdownModal from "./game/BreakdownModal";
import AboutUs from "./game/AboutUs";
import FAQ from "./game/FAQ";
import Advertise from "./game/Advertise";
import { AppContext } from "./hooks/context";

export const ModalToDisplay = {
  INSTRUCTIONS: "INSTRUCTIONS",
  FAQ: "FAQ",
  STATISTICS: "STATISTICS",
  BREAKDOWN: "BREAKDOWN",
  ABOUT_US: "ABOUT_US",
  ADVERTISE: "ADVERTISE",
};

function App() {
  const [guess, setGuess] = useState(0);
  const { modalToDisplay, setModalToDisplay } = useContext(AppContext);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch("/api/items");
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, []);

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
    <div>
      <div className="app">
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/play"
              element={<MainGamePage guess={guess} setGuess={setGuess} />}
            />
            <Route path="/results" element={<Results guess={guess} />} />
            <Route path="/share" element={<Share />} />
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
              <BreakdownModal
                onClose={() => setModalToDisplay("")}
                items={items}
              />
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
      <ContactUs />
    </div>
  );
}

export default App;
