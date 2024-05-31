import React from 'react';

const DateAndGameNumber = ({ currentProductDate, gameDate }) => {

    function getDateString(date) {
        const d = new Date(date);
        const day = ("0" + d.getDate()).slice(-2);
        const month = ("0" + (d.getMonth() + 1)).slice(-2);
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }
    
    function getDaysSince() {
        const targetDate = new Date('2024-05-31');
        const givenDate = new Date(gameDate);

        const timeDiff = Math.abs(givenDate.getTime() - targetDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    }

    return (
        <div className='info-container'>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent accent'>Priced on</p>
                <p style={{ margin: '0 0 8px 0' }}>{getDateString(currentProductDate || '31/05/2024')}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p className='input-container-narrow-screen-accent accent'>Game</p>
                <p style={{ margin: '0 0 8px 0' }}>#{getDaysSince()}</p>
            </div>
        </div>       
    );
};

export default DateAndGameNumber;
