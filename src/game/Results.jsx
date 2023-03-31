import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/game.css';

function Results({ guess }) {
    const location = useLocation();
    const correctPrice = location.state.correctPrice;
    const [error, setError] = useState({ difference: undefined, percentageError: undefined })

    useEffect(() => {
        let difference
        correctPrice >= guess ? difference = correctPrice - guess : difference = guess - correctPrice
        const percentage = (difference / correctPrice) * 100
        setError({ difference: difference, percentageError: percentage })
    }, [guess]);
    
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
                    <p>{error.difference?.toFixed(2)}</p>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">RANK</div>
                    <p>{error.percentageError?.toFixed(0)}%</p>
                </div>
                <div className="statistics-results">
                    <a className='statistics-button-styling' href="/statistics">Statistics</a>
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