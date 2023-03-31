import React, { useState } from 'react';
import '../styles/game.css';
import { useNavigate } from 'react-router-dom';

function Submit({ setGuess, correctPrice }) {
  const navigate = useNavigate();
  const [guessValue, setGuessValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputValid, setInputValid] = useState(false);

  const handleInputChange = (event) => {
    setGuessValue(event.target.value);
    setInputValid(/^\d+(\.\d{2})?$/.test(event.target.value));
  };

  const handleGuessSubmit = () => {
    const regex = /^\d+(\.\d{2})?$/;
    if (regex.test(guessValue)) {
      setGuess(parseFloat(guessValue));
      navigate('/results', { state: { guess: parseFloat(guessValue), correctPrice: correctPrice } });
    } else {
      setErrorMessage("Please enter a valid number with exactly two decimal places");
    }
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
          pattern="\d+(\.\d{2})?"
          value={guessValue}
          onChange={handleInputChange}
          title="Please enter a valid number with exactly two decimal places"
        />
      </div>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <button
                className={`submit-button sub-button-styling ${inputValid ? 'valid-input' : ''}`}
        onClick={handleGuessSubmit}
      >
        Submit
      </button>
    </div>
  );
}

export default Submit;