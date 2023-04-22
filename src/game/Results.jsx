import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/game.css';
import Feedback from './Feedback';
import Modal from "react-modal";

function Results() {
  const location = useLocation();
  const correctPrice = location.state.correctPrice;
  const guess = location.state.guess;
  const [error, setError] = useState({ difference: undefined, percentageError: undefined });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleFeedbackClick = (e) => {
    e.preventDefault();
  setShowFeedbackModal(true);
  };

  const handleCloseModal = () => {
    setShowFeedbackModal(false)
  };

  useEffect(() => {
    let difference;
    const numericGuess = parseFloat(guess);
    if (correctPrice >= numericGuess) {
      difference = numericGuess - correctPrice;
      setError({ difference: difference, percentageError: -1 * (difference / correctPrice) * 100 });
    } else {
      difference = numericGuess - correctPrice;
      setError({ difference: difference, percentageError: (difference / correctPrice) * 100 });
    }
  }, [guess, correctPrice]);

  return (
    <div className="main--layout--results">
      <div className="box-results">
        <div className="h1-results">
          <h1>The actual cost of the groceries</h1>
        </div>
        <div className="guess-results">
          <div className="guessed-box">£</div>
          <p>£{correctPrice?.toFixed(2)}</p>
        </div>
        <div className="error-results">
          <div className="error-box">ERROR</div>
          <p>{error.percentageError ? (guess > correctPrice ? '+' : '-') : ''}{Math.abs(error.percentageError)?.toFixed(1)}%</p>
        </div>
        <div className="percentile-results">
          <div className="percentile-box">RANK</div>
          <p>{error.percentageError?.toFixed(0)}</p>
        </div>
        <div className="statistics-results">
          <a className='statistics-button-styling' href="/statistics">Statistics</a>
        </div>
        <div className="share-results">
          <a className='share-button-styling' href="/share">Share</a>
        </div>
        <div className="feedback-results">
          {showFeedbackModal && (
        <Modal
          className={"modal"}
          isOpen={showFeedbackModal}
          onRequestClose={handleCloseModal}
        >
          <Feedback onClose={handleCloseModal} />
        </Modal>
      )}
          <a className='feedback-button-styling' onClick={handleFeedbackClick} href="/feedback">Feedback</a>
        </div>
      </div>
    </div>
  );
}

export default Results;