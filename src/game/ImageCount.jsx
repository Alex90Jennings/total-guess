import React from 'react';
import '../styles/game.css';
import NumberImage from './NumberImage';

function ImageCount(props) {
  const { currentShopIndex, totalAmount } = props;
  return (
    <div className="image-counter">
      <NumberImage number={currentShopIndex + 1} />
      <p>Amount: £{totalAmount.toFixed(2)}</p>
    </div>
  );
}

export default ImageCount;
