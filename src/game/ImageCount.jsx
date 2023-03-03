import React from 'react';
import '../styles/game.css';
import NumberImage from './NumberImage';

function ImageCount(props) {
  const { currentShopIndex } = props;
  return (
    <div className="image-counter">
      <NumberImage number={currentShopIndex + 1} />
    </div>
  );
}

export default ImageCount;
