import React, { useContext } from 'react';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";

const BreakdownModal = ({ onClose }) => {
    const { breakdown } = useContext(AppContext);

    if (breakdown?.length === 0 || !breakdown) return <p>Please play a game to see your receipt!</p>;

    const generateShareUrl = () => {
        const gameNumber = Math.floor((new Date() - new Date('2024-06-01')) / (1000 * 60 * 60 * 24));
        const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
        const numericGuess = breakdown.reduce((sum, item) => sum + item.guess, 0);
        const correctPrice = breakdown.reduce((sum, item) => sum + item.correctPrice, 0);
        const difference = numericGuess <= correctPrice ? correctPrice - numericGuess : numericGuess - correctPrice;
        let percentageError = ((difference / correctPrice) * 100).toFixed(0);
        if (percentageError > 35) percentageError = 35;
        const emojiMap = breakdown.map(item => {
            const errorPercentage = Math.abs((item.guess - item.correctPrice) / item.correctPrice) * 100;
            if (errorPercentage <= 25) return '🟩';
            if (errorPercentage <= 50) return '🟨';
            if (errorPercentage <= 75) return '🟧';
            return '🟥';
        }).join('');
    
        const text = `Game ${gameNumber} - ${date}%0A%0A${emojiMap}%0A%0AMy Daily #totalguess Percent: ${percentageError}%0A%0ACheck it out at www.total-guess.com%0A%0AThe daily game to challenge your #costofliving knowledge`;
        const url = `https://x.com/intent/post?text=${text}`;
        return url;
    };    

    const handleShareClick = () => {
        const shareUrl = generateShareUrl();
        window.open(shareUrl, '_blank');
    };

    return (
        <div className="modal-display">
            <button className="close-btn" onClick={onClose}>
                X
            </button>
            <header>
                <h1 className="h1-statistics">Total-Guess Receipt</h1>
            </header>
            <table>
                <thead>
                    <tr>
                        <th style={{ width: '100%', textAlign: 'left', marginRight: 'auto' }} className='table-row-breakdown'>Item</th>
                        <th className='table-row-breakdown'>Price</th>
                        <th className='table-row-breakdown'>Guess</th>
                        <th className='table-row-breakdown'>%</th>
                    </tr>
                </thead>
                <tbody>
                    {breakdown.map((item, index) => (
                        <tr key={index}>
                            <td style={{ textAlign: 'left', color: 'white' }} className='table-row-breakdown'>{item.description}</td>
                            <td style={{ textAlign: 'center', color: 'white' }} className='table-row-breakdown'>£{item.correctPrice.toFixed(2)}</td>
                            <td style={{ textAlign: 'center', color: 'white' }} className='table-row-breakdown'>£{item.guess.toFixed(2)}</td>
                            <td style={{ textAlign: 'center', color: 'white' }} className='table-row-breakdown'>
                                {(((item.guess - item.correctPrice) / item.correctPrice) * 100).toFixed(0)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p>Share today's score by clicking the button below:</p>
            <div className='three-columns-expand-one-three'>
                <div></div>
                <button className="twitter-share-btn" onClick={handleShareClick}>
                    <img src={'/icons/ttwitter.png'} alt="twitter icon" />
                </button>
                <div></div>
            </div>
        </div>
    );
};

export default BreakdownModal;
