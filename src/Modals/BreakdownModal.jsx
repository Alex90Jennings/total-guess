import React, { useContext } from 'react';
import '../styles/modal.css';
import '../styles/share.css';
import { AppContext } from "../hooks/context";

const BreakdownModal = ({ onClose }) => {
    const { breakdown } = useContext(AppContext);

    if(breakdown?.length === 0 || !breakdown) return <p>Please a game to see your receipt!</p>

    return (
        <div className="modal-display">
            <button className="close-btn" onClick={onClose}>
                X
            </button>
            <header>
                <h1  className="h1-statistics">Total-Guess Receipt</h1>
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
                            <td style={{ textAlign: 'center', color: 'white'  }} className='table-row-breakdown'>
                                {(((item.guess - item.correctPrice) / item.correctPrice) * 100).toFixed(0)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BreakdownModal;
