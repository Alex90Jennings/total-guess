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
    const playerGuess = location.state.numericGuess;

    return (
        <div className="main--layout--results">
            <div className="box-results">
                <div className="h1-results">
                    <h1>The actual cost of the groceries</h1>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">TOTAL COST</div>
                    <p>£{correctPrice?.toFixed(2)}</p>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">TOTAL GUESS</div>
                    <p>£{playerGuess}</p>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">DIFFERENCE</div>
                    {
                        difference < 0 ?
                            <p className={difference < 0 ? "red-text" : ""}>{`-£${(difference * -1).toFixed(2)}`}</p> :
                            <p>£{difference.toFixed(2)}</p>
                    }
                </div>
                <div className="percentile-results">
                    <div  className="percentile-box">ERROR</div>
                    <p className={difference < 0 ? "red-text" : ""}>
                        {
                            percentageError >= 50 || percentageError <= -50 ? 
                                `${percentageError.toFixed(0)}+%` : 
                                `${percentageError.toFixed(2)}%`
                        }
                    </p>
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