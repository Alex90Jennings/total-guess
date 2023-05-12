import React from 'react';
import '../styles/modal.css'

function FAQ({ onClose }) {
    
    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>Frequently-asked questions</h1>
            <div className='list-reset pl-m'>
                <h2>What is Cantab</h2>
                <p>Easy! It's a simple skill game that rates your guessing ability of grocery prices and adding up.</p></div>
            <div className='list-reset pl-m'>
                <h2>How many grocery items are there?</h2>
                <p>Relax! There are only ten grocery items to review in each game.</p>
                </div>
            <div className='list-reset pl-m'>
                <h2>Do the prices include discounts?</h2>
                <p>Good question! Any discounts will be stated clearly in the game.</p>
                </div>
            <div className='list-reset pl-m'>
                <h2>Are local price variations included</h2>
                <p>Yes, of course! The locality will be stated clearly in the game.</p>
                </div>
            <div className='list-reset pl-m'>
                <h2>Does the game have a time limit?</h2>
                <p>Nope! The time limit is as long as your tea break.</p>
                </div>
            <div className='list-reset pl-m'>
                <h2>How often can I play this game?</h2>
                <p>Steady! A new game is released every day.</p>
                </div>
            <div className='list-reset pl-m'>
                <h2>Can I play with my friends?</h2>
                <p>Sure thing! You can share your stats through email and social media.</p>
                </div>
        </div>
    );
}

export default FAQ;