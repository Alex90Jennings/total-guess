import React, { useState, useContext } from 'react';
import '../styles/game.css';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../hooks/context';
import { clientApi } from '../api/clientApi';

function Submit({ guess, setGuess, correctPrice }) {

    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState('');
    const [inputValid, setInputValid] = useState(false);
    const { loggedInUser, setLoggedInUser, gameDate, isMuted } = useContext(AppContext);
    const [audio] = useState(new Audio('/Sounds/coins.mp3'));

    const handleInputChange = (event) => {
        const inputValue = event.target.value;
        if (/^\d*(\.\d{0,2})?$/.test(inputValue)) {
            setGuess(inputValue);
            setInputValid(true);
            setErrorMessage('');
        } else {
            setInputValid(false);
            if (inputValue !== '') {
                setErrorMessage('Please enter a valid number with at most two decimal places');
            } else {
                setErrorMessage('');
            }
        }
    };

    const handleGuessSubmit = async () => {
        const numericGuess = parseFloat(guess).toFixed(2);
        const difference = numericGuess <= correctPrice ? correctPrice - numericGuess : numericGuess - correctPrice;
        let percentageError = (difference / correctPrice) * 100 * (numericGuess <= correctPrice ? -1 : 1);
        
        if (percentageError > 50) {
            percentageError = 50;
        } 
        if (percentageError < -50) {
            percentageError = -50;
        }

        if (loggedInUser) {
            const response = await clientApi.submitResult(loggedInUser.email, gameDate, percentageError);
            setLoggedInUser(response.data);
            if(!isMuted) audio.play();
        }

        navigate('/results', { state: { numericGuess, difference, percentageError, correctPrice } });
    };

    return (
        <div className="main--layout--submit box-submit">
            <div className="h1-submit">
                <h1>Guess the total cost of the groceries</h1>
            </div>
            <div className="guess-amount">
                <div className="blue-box">£</div>
                <input
                    type="text"
                    value={guess}
                    onChange={handleInputChange}
                    title="Please enter a valid number with at most two decimal places"
                />
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <button className={`submit-button sub-button-styling ${inputValid ? 'valid-input' : ''}`} onClick={handleGuessSubmit} disabled={!inputValid}>
                Submit
            </button>
        </div>
    );
}

export default Submit;
