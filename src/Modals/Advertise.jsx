import React from 'react';
import '../styles/modal.css';

function Advertise({ onClose }) {
    return (
        <div className='modal-content'>
            <header>
                <h1>Advertise with us</h1>
            </header>
            <section>
                <h2>WHO IS THIS GAME FOR?</h2>
                <p>Our game platform is an increasingly popular destination for price-conscious shoppers.</p>
                <p>We offer a fun and engaging experience, which would be an ideal association for many retail brands.</p>
            </section>
            <section>
                <h2>HOW DO WE CONTACT YOU?</h2>
                <p>
                    If you would like to learn more about opportunities to collaborate with us at Total Guess, please let us know: 
                    <a href="mailto:totalguessgame@gmail.com" className='link-email'>totalguessgame@gmail.com</a>
                </p>
            </section>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default Advertise;
