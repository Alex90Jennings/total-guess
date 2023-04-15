import React, { useState } from 'react';
import '../styles/game.css';
import { useNavigate } from 'react-router-dom';

function Submit({ setGuess, correctPrice }) {
  const navigate = useNavigate();
  const [guessValue, setGuessValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputValid, setInputValid] = useState(false);

const handleInputChange = (event) => {
  const inputValue = event.target.value;
  if (/^\d*(\.\d{0,2})?$/.test(inputValue)) {
    setGuessValue(inputValue);
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

 const handleGuessSubmit = () => {
  const numericGuess = parseFloat(guessValue).toFixed(2);
  setGuess(numericGuess);
  navigate('/results', { state: { guess: numericGuess, correctPrice: correctPrice } });
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
          value={guessValue}
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
