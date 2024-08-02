import React from 'react';
import '../styles/modal.css';

function NewBadgeEarned({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1>Congratulations!</h1>
            </header>
            <section>
                <h2>YOU'VE EARNED A NEW BADGE</h2>
                <p>To check all your badges, click on the button with your initials in the top left of the screen.</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default NewBadgeEarned;
