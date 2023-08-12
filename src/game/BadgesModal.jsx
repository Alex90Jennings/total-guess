import React from 'react';
import '../styles/modal.css'

function Badges({ onClose }) {
    const { loggedInUser } = useContext(AppContext);

    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>Badges</h1>
            <div className='list-reset pl-m'>
                <h2>Groceries</h2>
                {loggedInUser.groceriesBadges.length === 0 && <p>Play a game to earn badges</p>}
                {
                    loggedInUser.groceriesBadges.length > 0 && loggedInUser.groceriesBadges.map(
                        (badge, index) => (
                            <div key={index}>
                                <img src={`/icons/${badge.replace(/_/g, '-')}`} alt={`${badge}`} /> 
                            </div>
                        )
                    )
                }
            </div>
            <div className='list-reset pl-m'>
                <h2>Football Transfers</h2>
                <p>Coming soon.</p>
            </div>
            <div className='list-reset pl-m'>
                <h2>Calories</h2>
                <p>Coming soon.</p>
            </div>
        </div>
    );
}

export default Badges;