import React, { useState } from 'react';
import '../styles/game.css';
import { useNavigate } from 'react-router-dom';

function Submit({ setGuess }) {
    const navigate = useNavigate();
    const [guessValue, setGuessValue] = useState('');
  
    const handleInputChange = (event) => {
        setGuessValue(event.target.value);
    }
  

    const handleGuessSubmit = () => {
        setGuess(guessValue)
        navigate('/results');
    }


    return (
        <div className="main--layout--submit box-submit">
            <div className="h1-submit">
                <h1>Guess the total cost of the groceries</h1>
            </div>
            <div className="guess-amount">
                <div className="blue-box">£</div>
                <input type="text" value={guessValue} onChange={handleInputChange} />
            </div>
            <button className='submit-button sub-button-styling' onClick={handleGuessSubmit}>Submit</button>
        </div>
    );
}

export default Submit;