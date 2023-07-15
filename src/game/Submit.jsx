import React, { useState, useContext } from 'react';
import '../styles/game.css';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../hooks/context';
import { clientApi } from '../api/clientApi';

function Submit({ correctPrice, itemPrices, guess }) {
    const navigate = useNavigate();
    const { loggedInUser, setLoggedInUser, gameDate, isMuted } = useContext(AppContext);
    const [audio] = useState(new Audio('/Sounds/coins.mp3'));

    const handleGuessSubmit = async () => {
        const numericGuess = (itemPrices.concat(Number(guess || 0))).reduce((sum, price) => sum + price, 0).toFixed(2);
        const difference = Math.abs(correctPrice - numericGuess);
        let percentageError = ((difference / correctPrice) * 100).toFixed(2);

        if (percentageError > 35) {
            percentageError = 35;
        }

        if (loggedInUser) {
            const response = await clientApi.submitResult(loggedInUser.email, gameDate, percentageError);
            setLoggedInUser(response.data);
            if (!isMuted) audio.play();
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
                    value={((itemPrices.concat(Number(guess || 0))).reduce((sum, price) => sum + price, 0)).toFixed(2)}
                    disabled
                />
            </div>
            <button className="submit-button sub-button-styling three-rows-expand-one-three" onClick={handleGuessSubmit}>
                <div></div>
                <div>Submit</div>
                <div></div>
            </button>
        </div>
    );
}

export default Submit;
