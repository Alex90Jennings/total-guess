import React, { useContext, useState } from 'react';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";
import { gameNumber as getGameNumber } from "../data/dailyGame";

const BreakdownModal = ({ onClose }) => {
    const { breakdown } = useContext(AppContext);
    const [copied, setCopied] = useState(false);

    if (breakdown?.length === 0 || !breakdown) return <p>Please play a game to see your receipt!</p>;

    const generateShareText = () => {
        const gameNumber = getGameNumber();
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
    
        // Build the text plainly and encode it once. It used to be hand-encoded
        // (%0A, %23) with raw spaces and colons left in the query string, which
        // gave X a malformed intent.
        const text = [
            `Game ${gameNumber} - ${date}`,
            emojiMap,
            `My Daily #totalguess Percent: ${percentageError}`,
            'Check it out at www.total-guess.com',
            'The daily game to challenge your #costofliving knowledge',
        ].join('\n\n');

        return text;
    };

    const shareText = generateShareText();

    // A plain link, not window.open: passing a features string opens a popup
    // window rather than a tab, and a stripped referrer makes X more likely to
    // throw up its login wall.
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

    // Copying always works, whatever X decides about your session.
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
        } catch {
            const field = document.createElement('textarea');
            field.value = shareText;
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            try { document.execCommand('copy'); } catch { /* nothing else to try */ }
            document.body.removeChild(field);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
            <p>Share today's score:</p>
            <div className='share-row'>
                <button className="copy-share-btn" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy result'}
                </button>
                {/*
                  * rel is deliberately "noopener" without "noreferrer": X is more
                  * likely to show its login wall when the referrer is stripped.
                  * noopener alone closes the security hole on every current
                  * browser; the lint rule is about much older ones.
                  */}
                {/* eslint-disable-next-line react/jsx-no-target-blank */}
                <a
                    className="twitter-share-btn"
                    href={tweetUrl}
                    target="_blank"
                    rel="noopener"
                    aria-label="Share on X"
                >
                    <img src={'/icons/ttwitter.png'} alt="X icon" />
                </a>
            </div>
        </div>
    );
};

export default BreakdownModal;
