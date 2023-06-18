import React from 'react';
import '../styles/modal.css'

function GameInstructions({ onClose }) {
    
return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className="close-btn" onClick={() => onClose()}>
                    X
                </button>
            </div>
            <h1>Instructions</h1>
            <h2>GUESS THE TOTAL COST OF THE BASKET OF GROCERIES</h2>
            <ul className='list-reset pl-m'>
                <li>There is a virtual basket of ten grocery items, all from a single supermarket.</li>
                <li>Take a moment to consider the cost of each grocery item individually.</li>
                <li>Make your best guess for the cost of each individual grocery item.</li>
                <li>Keep track of all your guesses and add them up however you like.</li>
                <li>Submit your total guess.</li>
            </ul>
            <h2>ASSESSING YOUR PERFORMANCE</h2>
            <ul className='list-reset pl-m'>
                <li>After submitting your total guess, your score will be displayed as a percentage error.</li>
                <li>A histogram and summary statistics can be accessed, providing you an overview of your play history.</li>
            </ul>
        </div>
    );
}

export default GameInstructions;
