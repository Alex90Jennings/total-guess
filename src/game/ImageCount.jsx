import React, { useState, useEffect } from 'react';
import '../styles/game.css';

function ImageCount(props) {
  const { currentShopIndex } = props;
  const [numberImages, setNumberImages] = useState([]);

  useEffect(() => {
    const generateNumberImages = () => {
      const newImages = [ '1.png', ...new Array(9).fill('10.png') ].map((image, i) => {
        if (currentShopIndex === 0 && i === 0) {
          return '1.png';
        } else if (i <= currentShopIndex) {
          return `${i + 1}.png`;
        } else {
          return '10.png';
        }
      });
      setNumberImages(newImages);
    };
    
    generateNumberImages();
  }, [currentShopIndex]);

  return (
    <div className='three-columns-expand-one-three'>
      <div></div>
      <div className="image-counter mg-m">
        {numberImages.map((image, i) => (
          <div key={i} className="number-box">
            <img src={`/Numbers/${image}`} alt={`${i + 1}`} />
          </div>
        ))}
      </div>
      <div></div>
    </div>
  );
}

export default ImageCount;


