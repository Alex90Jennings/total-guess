/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/game.css';
import { ModalToDisplay } from '../App';
import { AppContext } from '../hooks/context';

function Results() {
    
    const { setModalToDisplay } = useContext(AppContext);
    const location = useLocation();
    const difference = location.state.difference;
    const percentageError = location.state.percentageError;
    const correctPrice = location.state.correctPrice;

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
                <div className="percentile-results">
                    <div className="percentile-box">DIFFERENCE</div>
                    <p>£{difference.toFixed(2)}</p>
                </div>
                <div className="error-results">
                    <div className="error-box">ERROR</div>
                    <p>{percentageError.toFixed(1)}%</p>
                </div>
                <div className="statistics-results">
                    <div className='statistics-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>Statistics</div>
                </div>
                {/*
                <div className="share-results">
                    <a className='share-button-styling' href="/share">Share</a>
                </div>
                */}
                <div className="feedback-results">
                    {/*<a className='feedback-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.FEEDBACK)} href="/feedback">Feedback</a>*/}
                    <Link to="/" className='feedback-button-styling'>Home Page</Link>
                </div>
            </div>
        </div>
    );
}

export default Results;