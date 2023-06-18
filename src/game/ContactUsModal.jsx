import React from 'react';
import '../styles/modal.css'

function ContactUsModal({ onClose }) {
    
    return (
        <div className='pl-l pr-l'>
            <div className='two-columns-expand-one'>
                <div></div>
                <button className='close-btn' onClick={onClose}>X</button>
            </div>
            <h1>Contact us because we are the best</h1>
            <div className='list-reset pl-m'>
                <p>Our idol is Paul Collingwood, an allrounder who can bat for hours</p>
            </div>
        </div>
    );
}

export default ContactUsModal;