import React from 'react';
import '../styles/modal.css';

function AlreadyPlayed({ onClose }) {
    return (
        <div className='modal-content'>
            <p>You have already submitted a score today! Please come back tomorrow!</p>
            <button className='close-btn' onClick={onClose}>X</button>
        </div>
    );
}

export default AlreadyPlayed;
