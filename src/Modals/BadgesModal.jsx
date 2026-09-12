import React, { useContext } from 'react';
import '../styles/modal.css';
import { AppContext } from "../hooks/context";

function Badges({ onClose }) {
    const { stats } = useContext(AppContext);
    const badges = stats?.badges ?? [];

    const replaceWordWithNumber = (word) => {
        const wordToNumber = {
            'one': '1',
            'five': '5',
            'ten': '10',
            'twenty': '20',
            'fifty': '50',
            'hundred': '100'
        };
    
        return wordToNumber[word] || word;
    };
    
    const getDescriptionForBadge = (badge) => {
        const partsOfBadge = badge.split('_');
        
        if (partsOfBadge[1] === 'game') {
            if (partsOfBadge[0] === 'one') return '1 game played';
            return `${replaceWordWithNumber(partsOfBadge[0])} games played`;
        }
    
        if (partsOfBadge[1] === 'guess') {
            return `Guess under ${replaceWordWithNumber(partsOfBadge[0])}%`;
        }
    };

    return (
        <div className='modal-content'>
            <header>
                <h1>Badges</h1>
            </header>
            <section>
                <h2>Groceries</h2>
                {badges.length === 0 && <p>Play a game to earn badges</p>}
                {
                    badges.length > 0 &&
                        <div className='auto-columns badge-container'>
                            {
                                badges.map(
                                    (badge, index) => (
                                        <div className='two-rows' key={badge}>
                                            <div className='three-columns-expand-one-three'>
                                                <div/>
                                                <img key={index} src={`/icons/${badge.replace(/_/g, '-')}.png`} className='badge' alt={`${badge}`} />
                                                <div/>
                                            </div>
                                            <p className='badge-description'>{getDescriptionForBadge(badge)}</p> 
                                        </div>
                                    )
                                )
                            }
                        </div>
                }
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
