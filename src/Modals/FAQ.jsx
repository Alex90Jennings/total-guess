import React from 'react';
import '../styles/modal.css';

function FAQ({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1>Frequently Asked Questions</h1>
            </header>
            <section>
                <h2>What is Total Guess?</h2>
                <p>It's a simple skill game that rates your ability to guess the price of supermarket groceries.</p>
            </section>
            <section>
                <h2>How many grocery items are there?</h2>
                <p> There are ten groceries per game.</p>
            </section>
            <section>
                <h2>Do the prices include discounts?</h2>
                <p>No, you should guess the full price of the groceries, unless a discount is stated in the description.</p>
            </section>
            <section>
                <h2>Are local price variations included?</h2>
                <p>No, there are generally no local price variations within the United Kingdom.</p>
            </section>
            <section>
                <h2>Does the game have a time limit?</h2>
                <p>No, the time limit is as long as your tea break.</p>
            </section>
            <section>
                <h2>How often can I play this game?</h2>
                <p>A new game is released every day at midnight UK.</p>
            </section>
            <section>
                <h2>Can I play with my friends?</h2>
                <p>Yes, you can share your stats through email and social media.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default FAQ;
