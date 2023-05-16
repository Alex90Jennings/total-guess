import React from 'react';
import '../styles/modal.css'

function Instructions({ onClose, playSound }) {
console.log('Instructions props:', onClose, playSound);
    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className="close-btn" onClick={() => {
    console.log('Close button clicked');
    onClose();
}}>X</button>
            </div>
            <h1>Instructions</h1>
            <h2>Guess the total cost of the basket of groceries</h2>
            <ul className='list-reset pl-m'>
                <li>There is a basket of ten grocery items from a single supermarket</li>
                <li>Review each grocery item in turn</li>
                <li>Add up your guesses for the cost of every item</li>
                <li>Submit your total cost</li>
                <li>The aim is to guess the correct total cost of the groceries</li>
            </ul>
            <h2>Assessing your guessing performances</h2>
            <ul className='list-reset pl-m'>
                <li>Your play history is displayed as a histogram and basic summary statistics</li>
                <li>Your performance is ranked against other players</li>
                <li>You can share your guessing performance with your friends</li>
            </ul>
            <hr className='white-line' />
            <div className='list-reset pl-m'>
                <p>A new basket of groceries is released every day at midnight. You can sign up for our daily reminder email.</p>
            </div>
            <hr className='white-line' />
            <div className='list-reset pl-m'>
                <p>Send us feedback at admin@cantab.com</p>
            </div>
        </div>
    );
}

export default Instructions;
