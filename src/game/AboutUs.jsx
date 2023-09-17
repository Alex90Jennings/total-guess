import React from 'react';
import '../styles/modal.css';

function AboutUs({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1>About us</h1>
            </header>
            <section>
                <h2>WHO ARE WE?</h2>
                <p>We are a team of makers who create quick and engaging games that are designed to entertain, test guessing, and arithmetic skills.</p>
            </section>
            <section>
                <h2>OUR AIMS</h2>
                <p>Our goal is to provide busy people with an opportunity for a short break to focus on something fun that feeds their curiosity.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default AboutUs;
