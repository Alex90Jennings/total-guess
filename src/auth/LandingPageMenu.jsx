import React from 'react';
import './landingPage.css'

function LandingPageMenu({ setShowLoginPage, setShowModal, setStartGame, isAuthenticated }) {
    const handleStartGameSubmit = () => {
        if(isAuthenticated) {
            setStartGame(true)
        } else {
            setShowLoginPage(true)
        }
    }

    return (
        <div>
            <h2>Guess the total cost of the groceries</h2>
            <ul className='list-reset'>
                <li>
                    <button onClick={handleStartGameSubmit}>Play</button>
                </li>
                <li>
                    <button onClick={() => setShowModal(true)}>Instructions</button>
                </li>
                <li>
                    <button onClick={() => setShowLoginPage(true)}>Sign In/Register</button>
                </li>
            </ul>
        </div>
    );
}

export default LandingPageMenu;
