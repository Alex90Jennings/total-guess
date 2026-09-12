import React from 'react';

const DateAndGameNumber = ({ gameNumber }) => {

    const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '.');

    return (
        <div className='info-container'>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent accent'>Today</p>
                <p style={{ margin: '0 0 8px 0' }}>{today}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent accent'>Game</p>
                <p style={{ margin: '0 0 8px 0' }}>#{gameNumber}</p>
            </div>
        </div>
    );
};

export default DateAndGameNumber;
