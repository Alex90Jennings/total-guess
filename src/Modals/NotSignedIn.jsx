import React from 'react';
import '../styles/modal.css';

function NotSignedIn({ onClose }) {

    return (
        <div className='modal-content'>
            <header>
                <h1>You are playing as a guest</h1>
            </header>
            <section>
                <h2>WHY AM I SEEING THIS MESSAGE?</h2>
                <p>You are not currently logged into total-guess.</p>
                <p>You can still play, but you will play yesterday's game. If you close or update your browser, your progress will be lost.</p>
            </section>
            <section>
                <h2>HOW CAN I LOG IN?</h2>
                <p>To log in and receive all the benefits of being a total-guess member, click the home icon in the top left and sign in/register from the home page</p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default NotSignedIn;
