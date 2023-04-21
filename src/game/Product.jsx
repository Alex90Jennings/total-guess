import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import '../styles/game.css';
import ProductImage from './ProductImage';
import ImageCount from './ImageCount';
import { groceries } from '../consts/hardcodedcodedData';

function Product({ setReadyToSubmit, setTotalPrice }) {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const totalAmount = 0;
  const currentProduct = groceries[currentShopIndex];
  const currentShop = currentProduct.shop;
  const currentDescription = currentProduct.description;
  const currentImage = groceries[currentShopIndex].image;

  const handleSwipe = (direction) => {
    let newIndex;
    if (direction === 'left') {
      newIndex = currentShopIndex + 1;
    } else if (direction === 'right') {
      newIndex = currentShopIndex - 1;
    }
    if (newIndex >= 0 && newIndex < groceries.length) {
      setCurrentShopIndex(newIndex);
    }
  };

  const handleArrowRightClick = () => {
    if (currentShopIndex === groceries.length - 1) {
      const totalPrice = groceries.reduce((sum, item) => sum + item.price, 0);
      setTotalPrice(totalPrice);

      setReadyToSubmit(true);
    } else {
      handleSwipe('left');
    }
  };

  return (
    <div className="three-rows-expand-one-three">
      <div></div>
      <div className="main--layout">
        <img
          src="/icons/arrowleftorange.svg"
          alt="Arrow Left"
          className="arrow-icon arrow-left"
          onClick={() => handleSwipe('right')}
        />
         <TinderCard
          className="tinder--card"
          preventSwipe={['up', 'down']}
          onSwipe={(dir) => handleSwipe(dir)}
          key={currentShopIndex}
        >
         <div className="box content">
  
    <div className="shop--css">{currentShop}</div>
    <div className="description--css mt-s">{currentDescription}</div>
    <div className="image-row">
      <ImageCount
        currentShopIndex={currentShopIndex}
        totalAmount={totalAmount}
        start={1}
        end={5}
      />
      <div className='space1'></div>
      <ProductImage currentImage={currentImage} />
      <div className='space2'></div>
      <ImageCount
        currentShopIndex={currentShopIndex}
        totalAmount={totalAmount}
        start={6}
        end={10}
      />
    </div>
    <div className="info-container">
      <div className="info-column">
        <p className="date">{currentProduct.date}</p>
      </div>
      <div className='space3'></div>
      <div className="info-column text-center">
        <p className="store">{currentProduct.store}</p>
      </div>
      <div className='space4'></div>
      <div className="info-column text-right">
        <p className="game">#{currentProduct.game}</p>
      </div>
    </div>

</div>
        </TinderCard>
        <img
  src="/icons/arrowrightorange.svg"
  alt="Arrow Right"
  className="arrow-icon arrow-right"
  onClick={handleArrowRightClick}
/>
      </div>
      <div></div>
    </div>
  );
}

export default Product;
