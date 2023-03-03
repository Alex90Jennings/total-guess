import './App.css';
import LandingPage from './auth/LandingPage.jsx'
import MainGamePage from './game/MainGamePage.jsx'
import GameInstructions from './game/GameInstructions';
import Modal from 'react-modal';
import { useState } from 'react';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [startGame, setStartGame] = useState(false)

    const handleCloseModal = () => setShowModal(false);

    return (
        <div>
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
        </div>
    );
}

export default App;
