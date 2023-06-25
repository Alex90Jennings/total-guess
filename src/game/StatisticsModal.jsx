import React from 'react';
import Statistics from './Statistics';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";
import { useContext } from "react";

const StatisticsModal = ({ className, onClose }) => {

    const { loggedInUser } = useContext(AppContext)

    function getBestGuess(scores) {
        if (!scores || scores.length === 0) {
            return 'N/A';
        }
      
        let closestScore = scores[0];
        for (let i = 1; i < scores.length; i++) {
            if (Math.abs(scores[i] - 0) < Math.abs(closestScore - 0)) {
                closestScore = scores[i];
            }
        }
      
        return closestScore.toFixed(2);
    }

    if (!loggedInUser?._id) {
        return <p>Please log in to see your stats!</p>
    }

    if (loggedInUser?.scores?.length === 0) {
        return <p>Play a game to see your stats!</p>
    }

    return (
        <div className={className}>
        <div className="pl-l pr-l">
            <button className="close-btn" onClick={() => {
                    onClose();
                }}>X</button>
            <div className="h1-statistics">Statistics</div>

            <div className="grid-container">
                <div className="grid-item">
                    <div className="gp-number">{loggedInUser?.gamesPlayed?.length}</div>
                    <div className='games-played'>GAMES PLAYED</div>
                </div>
                <div className="grid-item">
                    <div className="cs-number">{loggedInUser?.gamesPlayed?.length}</div>
                    <div className='current-streak'>CURRENT STREAK</div>
                </div>
                <div className="grid-item">
                    <div className="bs-number">{loggedInUser?.gamesPlayed?.length}</div>
                    <div className='best-streak'>BEST STREAK</div>
                </div>
            </div>

            <Statistics />

            <div className="grid-container2">
                <div className="grid-item2">
                    <div className='bg-number'>{getBestGuess(loggedInUser?.scores)}%</div>
                    <div className='best-guess'>BEST GUESS</div>
                </div>
                <div className="grid-item2">
                    <div className='ag-number'>{loggedInUser?.scores?.length > 0 ? (loggedInUser.scores.reduce((total, score) => total + Math.abs(score), 0) / loggedInUser.scores.length).toFixed(2) : 'N/A'}%</div>
                    <div className='average-guess'>AVERAGE ERROR</div>
                </div>
                <div className="grid-item2">
                    <div className='ag-number'>{loggedInUser?.scores?.length > 0 ? (loggedInUser.scores.reduce((total, score) => total + score, 0) / loggedInUser.scores.length).toFixed(2) : 'N/A'}%</div>
                    <div className='average-guess'>ERROR BIAS</div>
                </div>
            </div>

            <div className="grid-container3">
                <div className="grid-item3">
                    {/* <div className='rank-number'>#565</div> */}
                    {/* <div className='ranking'>RANKING</div> */}
                </div>
                <div className="grid-item3">
                    {/* <div className='players-number'>15,855</div> */}
                    {/* <div className='players'>PLAYERS</div> */}
                </div>
            </div>
            {/* <a className='share-button-styling' href="/share">Share</a> */}
            {/* <a className="feedback-button-share" href="/feedback">
                Feedback
            </a> */}
        </div>
        </div>
    );
};

export default StatisticsModal;
