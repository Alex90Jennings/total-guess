import React from 'react';
import '../styles/modal.css';

function GameInstructions({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1 className='instructions-h1'>Instructions</h1>
            </header>
            <section>
                <h2>GUESS THE TOTAL COST OF THE BASKET OF GROCERIES</h2>
                <ul className='list-reset'>
                    <li className='list-reset'>
                        <p>There is a virtual basket of ten grocery items, all from a single supermarket.</p>
                    </li>
                    <li className='list-reset'>
                        <p>Take a moment to consider the cost of each grocery item individually.</p>
                    </li>
                    <li className='list-reset'>
                        <p>Make your best guess for the cost of each individual grocery item.</p>
                    </li>
                    <li className='list-reset'>
                        <p>Keep track of all your guesses and add them up however you like.</p>
                    </li>
                    <li className='list-reset'>
                        <p>Submit your total guess.</p>
                    </li>
                </ul>
            </section>
            <section>
                <h2>ASSESSING YOUR PERFORMANCE</h2>
                <ul className='list-reset'>
                    <li className='list-reset'>
                        <p>After submitting your total guess, your score will be displayed as a percentage error.</p>
                    </li>
                    <li className='list-reset'>
                        <p>A histogram and summary statistics can be accessed, providing you an overview of your play history.</p>
                    </li>
                </ul>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default GameInstructions;
