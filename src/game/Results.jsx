import React from 'react';
import '../styles/game.css';

function Results() {
  return (
    <div className="main--layout--results">
        <div className="box-results">
            <div className="h1-results">
                <h1>The actual cost of the groceries</h1>
            </div>
            <div className="guess-results">
                <div className="guessed-box">£</div>
                <input type="text" />
            </div>
            <div className="error-results">
                <div className="error-box">ERROR</div>
                <input type="text" />
            </div>
            <div className="percentile-results">
                <div className="percentile-box">PERCENTILE</div>
                <input type="text" />
            </div>
            <div className="statistics-results">
                <a className='statistics-button-styling' href="/results">Statistics</a>
            </div>
            <div className="share-results">
                <a className='share-button-styling' href="/share">Share</a>
            </div>
            <div className="feedback-results">
                <a className='feedback-button-styling' href="/feedback">Feedback</a>
            </div>
        </div>
    </div>
  );
}

export default Results;