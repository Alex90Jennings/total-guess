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
        const totalError = breakdown.reduce((acc, item) => acc + ((item.guess - item.correctPrice) / item.correctPrice) * 100, 0) / breakdown.length;
        const totalErrorFormatted = totalError > 35 ? '35+' : totalError < -35 ? '-35+' :totalError.toFixed(0);
        const emojiMap = breakdown.map(item => {
            const errorPercentage = Math.abs((item.guess - item.correctPrice) / item.correctPrice) * 100;
            if (errorPercentage <= 33) return '🟩';
            if (errorPercentage <= 66) return '🟨';
            if (errorPercentage <= 100) return '🟧';
            return '🟥';
        }).join('');

        const hashtags = 'CostOfLiving,Inflation,GuessThePrice,SupermarketGame';
        const text = `Game ${gameNumber} - ${date}%0A%0A${emojiMap} ${totalErrorFormatted}pc%0A%0ACan you beat my score in the UK's best supermarket guessing game?%0A%0Ahttps%3A%2F%2Fwww.total-guess.com%0A%0A#${hashtags.replace(/,/g, ' #')}`;
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
