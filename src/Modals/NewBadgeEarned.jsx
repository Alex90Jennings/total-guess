import React, { useContext } from 'react';
import '../styles/modal.css';
import { AppContext } from '../hooks/context';
import { BADGES } from '../data/badges';

function NewBadgeEarned({ onClose }) {
    const { newBadges } = useContext(AppContext);
    const earned = BADGES.filter(badge => (newBadges ?? []).includes(badge.id));

    return (
        <div className='modal-content'>
            <header>
                <h1>Congratulations!</h1>
            </header>
            <section>
                <h2>{earned.length > 1 ? "YOU'VE EARNED NEW BADGES" : "YOU'VE EARNED A NEW BADGE"}</h2>
                <div className='auto-columns badge-container'>
                    {earned.map(badge => (
                        <div className='two-rows' key={badge.id}>
                            <div className='three-columns-expand-one-three'>
                                <div/>
                                <img
                                    src={`/icons/${badge.id.replace(/_/g, '-')}.png`}
                                    className='badge badge-new'
                                    alt={badge.label}
                                />
                                <div/>
                            </div>
                            <p className='badge-description'>{badge.label}</p>
                        </div>
                    ))}
                </div>
                <p>All your badges live behind the button with your initials, top left.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default NewBadgeEarned;
