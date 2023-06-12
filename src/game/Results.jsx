/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../styles/game.css';
import Feedback from './Feedback';
import Modal from "react-modal";

function Results() {
    
    const location = useLocation();
    const difference = location.state.difference;
    const percentageError = location.state.percentageError;
    const correctPrice = location.state.correctPrice;
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const handleFeedbackClick = (e) => {
        e.preventDefault();
        setShowFeedbackModal(true);
    };

    const handleCloseModal = () => {
        setShowFeedbackModal(false)
    };

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
                    <a className='statistics-button-styling' href="/statistics">Statistics</a>
                </div>
                {/*
                <div className="share-results">
                    <a className='share-button-styling' href="/share">Share</a>
                </div>
                */}
                <div className="feedback-results">
                    {
                        showFeedbackModal && (
                            <Modal
                                className={"modal"}
                                isOpen={showFeedbackModal}
                                onRequestClose={handleCloseModal}
                            >
                                <Feedback onClose={handleCloseModal} />
                            </Modal>
                        )
                    }
                    <a className='feedback-button-styling' onClick={handleFeedbackClick} href="/feedback">Feedback</a>
                    <Link to="/" className='feedback-button-styling'>Home Page</Link>
                </div>
            </div>
        </div>
    );
}

export default Results;