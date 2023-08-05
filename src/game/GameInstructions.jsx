import React from 'react';
import '../styles/modal.css'

function GameInstructions({ onClose }) {
    
return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className="close-btn" onClick={() => {
                    onClose();
                }}>X</button>
            </div>
            <h1 className='instructions-h1'>Instructions</h1>
            <h2 className='instructions-h2'>GUESS THE TOTAL COST OF THE BASKET OF GROCERIES</h2>
            <ul className='list-reset pl-m'>
                <p>There is a virtual basket of ten grocery items, all from a single supermarket.</p>
                <p>Take a moment to consider the cost of each grocery item individually.</p>
                <p>Make your best guess for the cost of each individual grocery item.</p>
                <p>Keep track of all your guesses and add them up however you like.</p>
                <p>Submit your total guess.</p>
            </ul>
            <h2 className='instructions-h2'>ASSESSING YOUR PERFORMANCE</h2>
            <ul className='list-reset pl-m'>
                <p>After submitting your total guess, your score will be displayed as a percentage error.</p>
                <p>A histogram and summary statistics can be accessed, providing you an overview of your play history.</p>
            </ul>
        </div>
    );
}

export default GameInstructions;
