import React, { useState, useEffect } from 'react';
import '../styles/game.css';

function ImageCount(props) {
  const { currentShopIndex, start, end } = props;
  const [numberImages, setNumberImages] = useState([]);

  useEffect(() => {
    const generateNumberImages = () => {
      const newImages = [...new Array(end - start + 1).fill('11.png')].map((image, i) => {
        const index = start + i - 1;
        if (currentShopIndex === 0 && index === 0) {
          return '1.png';
        } else if (index <= currentShopIndex) {
          return `${index + 1}.png`;
        } else {
          return '11.png';
        }
      });
      setNumberImages(newImages);
    };

    generateNumberImages();
  }, [currentShopIndex, start, end]);

  return (
    <div className="image-counter mg-m">
      {numberImages.map((image, i) => (
        <div key={i} className="number-box">
          <img src={`/Numbers/${image}`} alt={`${start + i}`} />
        </div>
      ))}
    </div>
  );
}

export default ImageCount;
