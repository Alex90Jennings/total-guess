import React from 'react';
import '../styles/modal.css'

function GameInstructions({ onClose }) {
    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>HOW TO PLAY</h1>
            <h2>SIGNING UP</h2>
            <ul className='list-reset pl-m'>
                <li>Navigate to the menu</li>
                <li>Press sign in</li>
                <li>Enter your details</li>
                <li>Click sign up</li>
            </ul>
            <h2>PLAYING THE GAME</h2>
            <ul className='list-reset pl-m'>
                <li>Navigate to the menu</li>
                <li>Press play</li>
                <li>Watch the shopping items as they appear and estimate their cost</li>
                <li>After 10 items, submit your guess</li>
            </ul>
            <h2>HOW DID I DO?</h2>
            <ul className='list-reset pl-m mb-xxl'>
                <li>In the top right, click the statistics</li>
                <li>Here you will find all the results from your previous guesses</li>
                <li>The lower you percentage difference the better</li>
                <li>Return everyday to submit new guesses</li>
            </ul>
        </div>
    );
}

export default GameInstructions;
