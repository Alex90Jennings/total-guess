import React from 'react';
import Modal from 'react-modal';
import Statistics from './Statistics';
import '../styles/modal.css';
import '../styles/share.css';

Modal.setAppElement('#root');

const StatisticsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      className="modal-stats"
      style={{
        content: {
          height: '80vh',
        },
      }}
      isOpen={isOpen}
      onRequestClose={onClose}
    >
      <div className="pl-l pr-l">
        <div className="h1-statistics">Statistics</div>

        <div className="grid-container">
          <div className="grid-item">
            <div className="gp-number">198</div>
            <div className='games-played'>GAMES PLAYED</div>
          </div>
          <div className="grid-item">
            <div className="cs-number">4</div>
            <div className='current-streak'>CURRENT STREAK</div>
          </div>
          <div className="grid-item">
            <div className="bs-number">27</div>
            <div className='best-streak'>BEST STREAK</div>
          </div>
        </div>

        <Statistics />

        <div className="grid-container2">
          <div className="grid-item2">
            <div className='bg-number'>+0.15%</div>
            <div className='best-guess'>BEST GUESS</div>
          </div>
          <div className="grid-item2">
            <div className='ag-number'>-11.5%</div>
            <div className='average-guess'>AVERAGE GUESS</div>
          </div>
        </div>

        <div className="grid-container3">
          <div className="grid-item3">
            <div className='rank-number'>#565</div>
            <div className='ranking'>RANKING</div>
          </div>
          <div className="grid-item3">
            <div className='players-number'>15,855</div>
            <div className='players'>PLAYERS</div>
          </div>
        </div>
        <a className='share-button-styling' href="/share">Share</a>
        <a className="feedback-button-share" href="/feedback">
                        Feedback
                    </a>
      </div>
    </Modal>
  );
};

export default StatisticsModal;
