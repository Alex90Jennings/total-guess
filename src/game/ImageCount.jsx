import React, { useState, useEffect } from 'react';
import '../styles/game.css';

function ImageCount(props) {
  const { currentShopIndex } = props;
  const [images, setImages] = useState([ '1.png', ...new Array(9).fill('10.png') ]);

  useEffect(() => {
    const newImages = images.map((image, i) => {
      if (currentShopIndex === 0 && i === 0) {
        return '1.png';
      } else if (i <= currentShopIndex) {
        return `${i + 1}.png`;
      } else {
        return '10.png';
      }
    });
    setImages(newImages);
  }, [currentShopIndex, images]);

  return (
    <div className="image-counter">
      {images.map((image, i) => (
        <div key={i} className="number-box">
          <img src={`/Numbers/${image}`} alt={`${i + 1}`} />
        </div>
      ))}
    </div>
  );
}

export default ImageCount;

