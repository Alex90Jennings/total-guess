import React, { useState, useEffect } from 'react';
import '../styles/game.css';
import ProductImage from './ProductImage';
import Timer from './Timer';
import ImageCount from './ImageCount';
import { groceries } from '../consts/hardcodedcodedData';

function Product(props) {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const [timer, setTimer] = useState(6);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimer((prevTimer) => prevTimer - 1);
    }, 1000);

    if (timer === 0 && currentShopIndex === groceries.length - 1) {
      setShowInput(true);
    } else if (timer === 0) {
      handleNextShop();
      setTimer(6);
    }

    return () => clearInterval(intervalId);
  }, [timer, currentShopIndex]);

  const currentProduct = groceries[currentShopIndex];
  const currentShop = currentProduct.shop;
  const currentDescription = currentProduct.description;
  const currentImage = groceries[currentShopIndex].image;

  const handleNextShop = () => {
    setCurrentShopIndex((currentShopIndex + 1) % groceries.length);
  };

  const handlePrevShop = () => {
    setCurrentShopIndex((currentShopIndex - 1 + groceries.length) % groceries.length);
  };

  return (
    <div className="main--layout">
      <div className="box box-1">
        <div className="arrow-l" onClick={handlePrevShop}></div>
        {showInput ? (
          <div className="input-container">
            <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="input-box">£</div>
            <input type="text" />
            </div>
            <button className="submit-button">Submit</button>
          </div>
        ) : (
          <div>
            <h2>{currentShop}</h2>
            <p>{currentDescription}</p>
            <div className="arrow-r" onClick={handleNextShop}></div>
            <ProductImage currentProduct={groceries[currentShopIndex]} currentImage={currentImage} />
            <Timer timer={timer} />
            <ImageCount currentShopIndex={currentShopIndex} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Product;

