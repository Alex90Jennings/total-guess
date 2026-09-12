import React, { useContext } from 'react';
import '../styles/modal.css';
import { AppContext } from "../hooks/context";
import { BADGES, bestGuess } from '../data/badges';

function Badges({ onClose }) {
    const { stats } = useContext(AppContext);
    const earned = stats?.badges ?? [];
    const played = stats?.gamesPlayed?.length ?? 0;
    const best = bestGuess(stats?.scores ?? []);

    // Locked badges are shown too, so there is something to aim at.
    const progressFor = (badge) => {
        if (badge.kind === 'game') return `${played}/${badge.threshold} games`;
        return best === null ? 'No games yet' : `Best so far: ${best.toFixed(1)}%`;
    };

    return (
        <div className='modal-content'>
            <header>
                <h1>Badges</h1>
            </header>
            <section>
                <h2>Groceries</h2>
                <p className='badge-count'>{earned.length} of {BADGES.length} earned</p>
                <div className='auto-columns badge-container'>
                    {
                        BADGES.map((badge) => {
                            const unlocked = earned.includes(badge.id);
                            return (
                                <div className='two-rows' key={badge.id}>
                                    <div className='three-columns-expand-one-three'>
                                        <div/>
                                        <img
                                            src={`/icons/${badge.id.replace(/_/g, '-')}.png`}
                                            className={unlocked ? 'badge' : 'badge badge-locked'}
                                            alt={badge.label}
                                        />
                                        <div/>
                                    </div>
                                    <p className='badge-description'>{badge.label}</p>
                                    {!unlocked && <p className='badge-progress'>{progressFor(badge)}</p>}
                                </div>
                            );
                        })
                    }
                </div>
            </section>
            <section>
                <h2>Football Transfers</h2>
                <p>Coming soon.</p>
            </section>
            <section>
                <h2>Calories</h2>
                <p>Coming soon.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default Badges;
