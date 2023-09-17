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
        <main className="main--layout--results">
            <div className="box-results">
                <div className='three-columns-expand-one-three trolley-icon'>
                    <div></div>
                    <img src="/icons/groceries.svg" alt="trolley"/>
                    <div></div>
                </div>
                <div className="h1-results">
                    <h1>The actual cost of the groceries</h1>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">TOTAL COST</div>
                    <p>£{correctPrice?.toFixed(2)}</p>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">TOTAL GUESS</div>
                    <p>£{playerGuess?.toFixed(2)}</p>
                </div>
                <div className="percentile-results">
                    <div className="percentile-box">DIFFERENCE</div>
                    <p>£{difference.toFixed(2)}</p>
                </div>
                <div className="percentile-results">
                    <div  className="percentile-box">GUESS ERROR</div>
                    <p>
                        {
                            percentageError >= 35 || percentageError <= -35 ? 
                                `${percentageError.toFixed(0)}%+` : 
                                `${percentageError.toFixed(0)}%`
                        }
                    </p>
                </div>
                <div className='result-buttons'>
                    <div className="statistics-results">
                        <div className='statistics-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>Statistics</div>
                    </div>
                    <div className="statistics-results">
                        {/*<a className='feedback-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.FEEDBACK)} href="/feedback">Feedback</a>*/}
                        <Link to="/" className='feedback-button-styling'>Home Page</Link>
                    </div>
                    <div className="statistics-results">
                        <div className='breakdown-button-styling' onClick={() => setModalToDisplay(ModalToDisplay.BREAKDOWN)}>Breakdown</div>
                    </div>
                    {/*
                    <div className="share-results">
                        <a className='share-button-styling' href="/share">Share</a>
                    </div>
                    */}
                </div>
            </div>
        </main>
    );
}

export default Results;