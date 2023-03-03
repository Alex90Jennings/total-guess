import React from 'react';

function GameInstructions({ onClose }) {
    return (
        <div>
            <button onClick={onClose}>Close</button>
            <h1>
                Welcome to Cantab
            </h1>
            <h2>Cantab is a simple game:</h2>
            <ul className='list-reset'>
                <li>Sign up</li>
                <li>Press play</li>
                <li>You have 60 seconds to quickly add up the prices of the displayed groceries</li>
                <li>Submit your guess</li>
            </ul>
        </div>
    );
}

export default GameInstructions;
