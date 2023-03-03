import React from 'react';
import '../styles/game.css';

function Timer(props) {
  const { timer } = props;

  return (
    <div className="timer">
      {timer}
    </div>
  );
}

export default Timer;