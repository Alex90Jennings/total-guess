import React from 'react';
import '../styles/modal.css';
import '../styles/share.css';

const BreakdownModal = ({ onClose, items }) => {
    return (
        <div className="modal-display">
            <div className="pl-l pr-l">
                <button className="close-btn" onClick={onClose}>
                    X
                </button>
                <div className="h1-statistics">Breakdown</div>

                <div className="grid-container">
                    <div className="grid-item">
                        <div className="itemDesc">Item Description</div>
                    </div>
                    <div className="grid-item">
                        <div className="itemCorrectPrice">Correct Item Price</div>
                        <div className="usersItemGuess">Users Item Guess</div>
                        <div className="ItemDifference">Item Price Difference</div>
                    </div>
                </div>

                {items.map((item, index) => (
                    <div className="grid-container" key={index}>
                        <div className="grid-item">
                            <div className="itemNo">{index + 1}</div>
                            <div className="itemImg"></div>
                            <div className="itemDesc">{item.description}</div>
                        </div>
                        <div className="grid-item">
                            <div className="itemCorrectPrice">£{item.price.toFixed(2)}</div>
                            <div className="usersItemGuess">£{item.guess.toFixed(2)}</div>
                            <div className="ItemDifference">
                                £{(item.guess - item.price).toFixed(2)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BreakdownModal;
