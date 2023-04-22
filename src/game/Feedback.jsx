import React from 'react';

function Feedback({ onClose }) {

  return (
    <div className='pl-l pr-l'>
      <div className='two-columns-expand-one'>
        <div></div>
        <button className='close-btn' onClick={onClose}>X</button>
      </div>
      <h1>Feedback</h1>
      <div className='list-reset pl-m'>
        <h2>John Smith</h2>
        <h3>john.smith80@gmail.com</h3>
      </div>
      <div className='list-reset pl-m'>
        <p>Please describe your feedback:</p>
        <textarea className="feedback-textarea" rows="5" cols="50" placeholder="Type your feedback here"></textarea>
      </div>
      <button className="feedback-submit-button">Submit</button>
    </div>
  );
}

export default Feedback;