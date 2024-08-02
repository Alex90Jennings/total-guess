import React from 'react';
import '../styles/modal.css';

function GeneralError({ onClose }) {
    return (
        <div className='modal-content'>
            <p>We're sorry! Something has gone wrong, please try again later.</p>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default GeneralError;
