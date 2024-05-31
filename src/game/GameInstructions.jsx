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
                        <p>Each day, the game selects a virtual basket of ten grocery items from various British supermarkets.</p>
                    </li>
                    <li className='list-reset'>
                        <p>These items which are presented to you in series, Each item includes its picture, descrption and the supermarket that is selling it.</p>
                    </li>
                    <li className='list-reset'>
                        <p>The aim of the game is to estimate the cost of each item and submit your best guesses.</p>
                    </li>
                </ul>
            </section>
            <section>
                <h2>ASSESSING YOUR PERFORMANCE</h2>
                <ul className='list-reset'>
                    <li className='list-reset'>
                        <p>After submitting your total guess, your score will be displayed as an absolute and percentage error.</p>
                    </li>
                    <li className='list-reset'>
                        <p>A histogram and summary statistics can be accessed, providing you an overview of your play history.</p>
                    </li>
                    <li className='list-reset'>
                        <p>Also, a breakdown of your individual guesses from the most recent game can be accessed to assess your performance in more detail.</p>
                    </li>
                </ul>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default GameInstructions;
