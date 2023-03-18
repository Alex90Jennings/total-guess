import React, { useState, useCallback } from 'react';
import TinderCard from 'react-tinder-card';
import '../styles/game.css';
import ProductImage from './ProductImage';
import ImageCount from './ImageCount';
import { groceries } from '../consts/hardcodedcodedData';
import '../styles/buttons.css';

function Product({ setReadyToSubmit }) {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const totalAmount = 0;
  const currentProduct = groceries[currentShopIndex];
  const currentShop = currentProduct.shop;
  const currentDescription = currentProduct.description;
  const currentImage = groceries[currentShopIndex].image;

    const handleSwipe = useCallback(
        (direction) => {
            let newIndex;
            if (direction === 'left') {
                newIndex = currentShopIndex + 1;
            } else if (direction === 'right') {
                newIndex = currentShopIndex - 1;
            }
            if (newIndex >= 0 && newIndex < groceries.length) {
                setCurrentShopIndex(newIndex);
            }
        },
        [currentShopIndex]
    );

    const isLastProduct = currentShopIndex === groceries.length - 1;

    const handleSubmit = () => {
        setReadyToSubmit(true)
    };

    return (
        <div className='three-rows-expand-one-three'>
            <div></div>
                <div className="main--layout">
                    <TinderCard
                        className="tinder--card"
                        preventSwipe={['up', 'down']}
                        onSwipe={(dir) => handleSwipe(dir)}
                        key={currentShopIndex}
                    >
                        <div className="box content">
                            <div>
                            <h2 className="shop--css">{currentShop}</h2>
                                <p className="description--css mt-s">{currentDescription}</p>
                                <ProductImage
                                    currentImage={currentImage}
                                />
                                <ImageCount
                                    currentShopIndex={currentShopIndex}
                                    totalAmount={totalAmount}
                                />
                            </div>
                        </div>
                        <div className="buttons">
                            <button onClick={() => handleSwipe('right')}>Previous Product!</button>
                            {
                                isLastProduct ? (
                                    <button onClick={handleSubmit}>Submit Guess</button>
                                ) : (
                                    <button onClick={() => handleSwipe('left')}>Next Product!</button>
                                )
                            }
                        </div>
                    </TinderCard>
                </div>
            <div></div>
        </div>
    );
}

export default Product;