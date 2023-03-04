import './App.css';
import LandingPage from './auth/LandingPage.jsx'
import MainGamePage from './game/MainGamePage.jsx'
import GameInstructions from './game/GameInstructions';
import Modal from 'react-modal';
import { useState } from 'react';
import Header from './game/Header';
import Footer from './game/Footer';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [startGame, setStartGame] = useState(false)

    const handleCloseModal = () => setShowModal(false);

    return (
        <div>
            <Header />
            {
                startGame && isAuthenticated ? (
                    <MainGamePage />
                ) : (
                    <LandingPage isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} setShowModal={setShowModal} setStartGame={setStartGame} />
                )
            }
            {
                showModal && (
                    <Modal isOpen={showModal} onRequestClose={handleCloseModal}>
                        <GameInstructions onClose={handleCloseModal}/>
                    </Modal>
                )
            }
            <Footer />
        </div>
    );
}

export default App;
