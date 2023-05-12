import React from 'react';
import '../styles/game.css';

function Timer({ timer }) {

    return <div className="timer">{timer > 0 ? timer : "Time's Up!"}</div>;
}

export default Timer;