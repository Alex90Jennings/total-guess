import React, { useState } from 'react';
import '../styles/game.css';
import ProductImage from './ProductImage';
import Timer from './Timer'; 
import ImageCount from './ImageCount';
import { groceries } from '../consts/hardcodedcodedData';

function Product(props) {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const currentProduct = groceries[currentShopIndex]; // update to get the current product object
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
        <img src="/icons/ArrowL.png" alt="Arrow Left" className="icon arrow-l" onClick={handlePrevShop} />
        <h2>{currentShop}</h2>
        <p>{currentDescription}</p>
        <img src="/icons/ArrowR.png" alt="Arrow Right" className="icon arrow-r" onClick={handleNextShop} />
        <ProductImage currentProduct={groceries[currentShopIndex]} currentImage={currentImage} />
        <Timer />
        <ImageCount currentShopIndex={currentShopIndex} />
      </div>
    </div>
  );
}

export default Product;






