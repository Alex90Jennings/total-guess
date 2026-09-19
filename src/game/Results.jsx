/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext } from 'react';
import { useDayRollover } from '../hooks/useDayRollover';
import { useLocation, Link, Navigate } from 'react-router-dom';
import '../styles/game.css';
import '../styles/screens.css';
import { ModalToDisplay } from '../App';
import { AppContext } from '../hooks/context';
import { formatError, isAtWall } from './scoring';

/** Colour band for the headline error, closest first. */
function bandFor(error) {
    const off = Math.abs(error);
    if (isAtWall(error)) return 'shame';
    if (off <= 5) return 'good';
    if (off <= 15) return 'ok';
    return 'off';
}

function verdictFor(error, difference) {
    if (difference < 0.005) return 'Penny perfect. That never happens.';
    if (isAtWall(error)) return 'Past the wall. Filed in the column of shame.';
    const direction = error < 0 ? 'Under' : 'Over';
    return `${direction} by £${difference.toFixed(2)}`;
}

function Results() {
    // Left open overnight, this should return to a playable game rather than
    // keep yesterday's score on screen.
    useDayRollover();

    const { setModalToDisplay, breakdown } = useContext(AppContext);
    const location = useLocation();

    // Arriving here without a finished basket (a refresh, a bookmark) has nothing to show.
    if (!location.state) return <Navigate to="/" replace />;

    const { difference, percentageError, correctPrice, numericGuess: playerGuess } = location.state;
    const hasReceipt = Array.isArray(breakdown) && breakdown.length > 0;
    const signedError = `${percentageError > 0 ? '+' : ''}${formatError(percentageError)}`;
    const guessShare = correctPrice ? Math.min(playerGuess / correctPrice, 1.35) / 1.35 : 0;

    return (
        <main className="screen">
            <div className="screen__inner">
                <p className="screen__eyebrow">Basket complete</p>

                <div className={`result-hero result-hero--${bandFor(percentageError)}`}>
                    <p className="result-hero__label">Guess error</p>
                    <p className="result-hero__value">{signedError}</p>
                    <p className="result-hero__verdict">{verdictFor(percentageError, difference)}</p>
                </div>

                <dl className="result-totals">
                    <div>
                        <dt>Actual total</dt>
                        <dd>£{correctPrice?.toFixed(2)}</dd>
                    </div>
                    <div>
                        <dt>Your total</dt>
                        <dd>£{playerGuess?.toFixed(2)}</dd>
                    </div>
                </dl>

                <div className="result-meter" aria-hidden="true">
                    <span className="result-meter__actual" style={{ left: `${(1 / 1.35) * 100}%` }} />
                    <span className="result-meter__guess" style={{ width: `${guessShare * 100}%` }} />
                </div>

                <div className="screen__actions">
                    {/* The item-by-item receipt only lives in memory, so it is gone after a refresh. */}
                    {hasReceipt && (
                        <button type="button" className="screen-button screen-button--primary" onClick={() => setModalToDisplay(ModalToDisplay.BREAKDOWN)}>
                            View receipt
                        </button>
                    )}
                    <button type="button" className={`screen-button ${hasReceipt ? 'screen-button--secondary' : 'screen-button--primary'}`} onClick={() => setModalToDisplay(ModalToDisplay.STATISTICS)}>
                        Statistics
                    </button>
                    <Link to="/" className="screen-link">Back to home</Link>
                </div>
            </div>
        </main>
    );
}

export default Results;
