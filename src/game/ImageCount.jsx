import React from 'react';
import '../styles/game.css';
import NumberImage from './NumberImage';

function ImageCount(props) {
  const { currentShopIndex } = props;

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="image-counter">
      {numbers.map((number) => (
        <div key={number} className={`number-box${number === currentShopIndex + 1 ? " highlight" : ""}`}>
          <NumberImage number={number} />
        </div>
      ))}
    </div>
  );
}


export default ImageCount;
