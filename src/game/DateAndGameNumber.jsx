import React from 'react';

const DateAndGameNumber = ({ gameNumber }) => {

    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '.');

    return (
        <div className='info-container'>
            <div className='info-cell info-cell-left'>
                <p className='input-container-narrow-screen-accent accent'>Today</p>
                <p className='info-value'>{today}</p>
            </div>
            <div className='info-cell info-cell-right'>
                <p className='input-container-narrow-screen-accent accent'>Game</p>
                <p className='info-value'>#{gameNumber}</p>
            </div>
        </div>
    );
};

export default DateAndGameNumber;
