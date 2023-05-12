import React from 'react';
import '../styles/modal.css';

function Advertise({ onClose }) {

    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>Advertise with us</h1>
            <div className='list-reset pl-m'>
                <p>Our game platform is an increasingly popular destination for price-conscious shoppers.</p>
            </div>
            <div className='list-reset pl-m'>
                <p>We offer a fun and engaging experience, which would be ideal association for many retail brands.</p>
            </div>
            <div className='list-reset pl-m'>
                <p>If you would like to learn more about opportunities to collaborate with Cantab, please let us know.</p>
            </div>
            <button className="contact-button">Contact us</button>
        </div>
    );
}

export default Advertise;