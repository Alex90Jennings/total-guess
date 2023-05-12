import React from 'react';
import '../styles/modal.css'

function AboutUs({ onClose }) {
    
    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>About us</h1>
            <div className='list-reset pl-m'>
             <p>We are a team of makers who create quick and engaging games that are designed to entertain, test guessing and arithmetic skills.</p></div>
             <div className='list-reset pl-m'>
             <p>Our goal is to provide busy people with an opportunity for a short break to focus on something fun that feeds their curiosity.</p></div>
        </div>
    );
}

export default AboutUs;