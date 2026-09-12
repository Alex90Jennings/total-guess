import React from 'react';
import Statistics from './Statistics';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";
import { useContext } from "react";

const StatisticsModal = ({ className, onClose }) => {

    const { stats } = useContext(AppContext)
    const scoresArray = stats?.scores ?? [];
    const gamesPlayed = stats?.gamesPlayed ?? [];

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

    // Dates are stored as YYYY-MM-DD (UTC), so a day is one step back from today.
    const dayKey = (date) => date.toISOString().slice(0, 10);

    function getCurrentStreak() {
        if (!gamesPlayed || gamesPlayed.length === 0) return 0;
        const played = new Set(gamesPlayed);
        const cursor = new Date();
        cursor.setUTCHours(0, 0, 0, 0);

        // A streak survives until yesterday; today being unplayed does not break it.
        if (!played.has(dayKey(cursor))) {
            cursor.setUTCDate(cursor.getUTCDate() - 1);
            if (!played.has(dayKey(cursor))) return 0;
        }

        let streak = 0;
        while (played.has(dayKey(cursor))) {
            streak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
        return streak;
    }

    function getBestStreak() {
        if (!gamesPlayed || gamesPlayed.length === 0) return 0;
        const days = [...new Set(gamesPlayed)].sort();
        let best = 1;
        let run = 1;

        for (let i = 1; i < days.length; i++) {
            const previous = new Date(`${days[i - 1]}T00:00:00Z`);
            previous.setUTCDate(previous.getUTCDate() + 1);
            run = dayKey(previous) === days[i] ? run + 1 : 1;
            if (run > best) best = run;
        }
        return best;
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
