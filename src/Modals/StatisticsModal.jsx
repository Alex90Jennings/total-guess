import React from 'react';
import Statistics from './Statistics';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";
import { useContext } from "react";

const StatisticsModal = ({ className, onClose }) => {

    const { loggedInUser } = useContext(AppContext)
    const scoresArray = loggedInUser?.scores || JSON.parse(localStorage.getItem("tgScores")) || [];
    const gamesPlayed = loggedInUser?.gamesPlayed || JSON.parse(localStorage.getItem("tgGamesPlayed")) || [];

    if (scoresArray?.length === 0) return <p>Play a game to see your stats!</p>

    function getBestGuess() {
        if (!scoresArray || scoresArray?.length === 0) return 'N/A';
      
        let closestScore = scoresArray[0];
        for (let i = 1; i < scoresArray?.length; i++) {
            if (Math.abs(scoresArray[i] - 0) < Math.abs(closestScore - 0)) {
                closestScore = scoresArray[i];
            }
        }
      
        return closestScore.toFixed(2);
    }

    function getCurrentStreak() {
        if(gamesPlayed?.length === 0) return 0
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1);
        let streak = 0;
        let dateOfComparison = today
        if(loggedInUser?.isAdmin) {
            const tomorrow = new Date(today);
            dateOfComparison = tomorrow.setDate(today.getDate() + 1);
            if(gamesPlayed.includes(new Date(tomorrow).toISOString())) streak++
            return calculateStreak(tomorrow, streak)
        } else {
            if(loggedInUser?._id) {
                if(gamesPlayed?.includes(new Date(today).toISOString())) streak++
            } else {
                const yesterday = new Date()
                yesterday.setDate(today.getDate() + 1);
                dateOfComparison = yesterday
                if(gamesPlayed?.includes(new Date(yesterday).toISOString())) streak++
            }
        }
        return calculateStreak(dateOfComparison, streak)
    }

    function calculateStreak(date, streak) {
        for (let i = gamesPlayed?.length; i > 0; i--) {
            const gameDate = new Date(gamesPlayed[i]).setUTCHours(0, 0, 0, 0);
            const diffInTime = date - gameDate;
            const diffInDays = diffInTime / (1000 * 3600 * 24);

            if (diffInDays === streak) {
                streak++;
            } else if (diffInDays > streak) {
                break;
            }
        }

        return streak;
    }

    function getBestStreak() {
        if(gamesPlayed?.length === 0) return 0
        let currentStreak = 0;
        let bestStreak = 0;
        let previousDate = null;

        for (let i = 0; i < gamesPlayed.length; i++) {
            const currentDate = new Date(gamesPlayed[i]);

            if (previousDate) {
                const diffInTime = currentDate - previousDate;
                const diffInDays = diffInTime / (1000 * 3600 * 24);

                if (diffInDays === 1) {
                    currentStreak++;
                } else if (diffInDays > 1) {
                    currentStreak = 0;
                }
            }

            previousDate = currentDate;

            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
        }

        return bestStreak + 1;
    }

    return (
        <section className={className}>
            <div className="pl-l pr-l">
                <button className="close-btn" onClick={() => {
                        onClose();
                    }}>X</button>
                <div className="h1-statistics">Statistics</div>

                <div className="grid-container">
                    <div className="grid-item">
                        <div className="gp-number">{gamesPlayed?.length}</div>
                        <div className='games-played'>GAMES PLAYED</div>
                    </div>
                    <div className="grid-item">
                        <div className="cs-number">{getCurrentStreak()}</div>
                        <div className='current-streak'>CURRENT STREAK</div>
                    </div>
                    <div className="grid-item">
                        <div className="bs-number">{getBestStreak()}</div>
                        <div className='best-streak'>BEST STREAK</div>
                    </div>
                </div>

                <Statistics />

                <div className="grid-container2">
                    <div className="grid-item2">
                        <div className='bg-number'>{getBestGuess()}%</div>
                        <div className='best-guess'>BEST GUESS</div>
                    </div>
                    <div className="grid-item2">
                        <div className='ag-number'>{(scoresArray?.reduce((total, score) => total + Math.abs(score), 0) / scoresArray?.length).toFixed(2)}%</div>
                        <div className='average-guess'>AVERAGE ERROR</div>
                    </div>
                    <div className="grid-item2">
                        <div className='ag-number'>{(scoresArray?.reduce((total, score) => total + score, 0) / scoresArray?.length).toFixed(2)}%</div>
                        <div className='average-guess'>ERROR BIAS</div>
                    </div>
                </div>
                {/* 
                <div className="grid-container3">
                    <div className="grid-item3">
                        <div className='rank-number'>#565</div> 
                        <div className='ranking'>RANKING</div> 
                    </div>
                    <div className="grid-item3">
                        <div className='players-number'>15,855</div> 
                        <div className='players'>PLAYERS</div> 
                    </div>
                </div>
                <a className='share-button-styling' href="/share">Share</a> 
                <a className="feedback-button-share" href="/feedback">
                    Feedback
                </a> 
                */}
            </div>
        </section>
    );
};

export default StatisticsModal;
