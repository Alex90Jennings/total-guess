import React, { useState, useEffect, useCallback } from 'react';
import '../styles/game.css';
import ProductImage from './ProductImage';
import Timer from './Timer';
import ImageCount from './ImageCount';
import { groceries } from '../consts/hardcodedcodedData';

function Product(props) {
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [timer, setTimer] = useState(6);
    const [showInput, setShowInput] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [answer, setAnswer] = useState(null);
    const currentProduct = groceries[currentShopIndex];
    const currentShop = currentProduct.shop;
    const currentDescription = currentProduct.description;
    const currentImage = groceries[currentShopIndex].image;
    
    const handleInputChange = (event) => {
        setAnswer(parseFloat(event.target.value));
    };

    const handleSubmit = () => {
        // handle submission
    };

    const handleNextShop = useCallback(() => {
        setCurrentShopIndex((currentShopIndex + 1) % groceries.length);
    }, [currentShopIndex]);

    const handlePrevShop = useCallback(() => {
        setCurrentShopIndex((currentShopIndex - 1 + groceries.length) % groceries.length);
    }, [currentShopIndex]);

    useEffect(() => {
        const total = groceries.reduce((acc, curr) => acc + curr.price, 0);
        setTotalAmount(total);
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
    }, [timer, currentShopIndex, handleNextShop]);


    return (
        <div className="main--layout">
        <div className="box box-1">
            <div className="arrow-l" onClick={handlePrevShop}></div>
                {
                    showInput ? (
                        <div className="input-container">
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="input-box">£</div>
                                <input type="text" onChange={handleInputChange} />
                            </div>
                            <button className="submit-button" onClick={handleSubmit}>
                                Submit
                            </button>
                            {
                                answer !== null && (
                                    <p className="result">
                                    {
                                        answer > totalAmount ? (
                                            <>
                                                <p>
                                                    You were £{(answer - totalAmount).toFixed(2)} over the actual amount.
                                                </p>
                                                <p>
                                                    That's a {((
                                                    ((answer - totalAmount) / totalAmount) * 100).toFixed(2) + '%')} difference from the actual amount.
                                                </p>
                                            </>
                                    ) : (
                                        <>
                                            <p>
                                                You were £{(totalAmount - answer).toFixed(2)} under the actual amount.
                                            </p>
                                            <p>
                                                That's a {((
                                                ((totalAmount - answer) / totalAmount) * 100).toFixed(2) + '%')} difference from the actual amount.
                                            </p>
                                        </>
                                    )}
                                </p>
                                )
                            }
                        </div>
                    ) : (
                    <div>
                        <h2 className='shop--css'>{currentShop}</h2>
                        <p className='description--css'>{currentDescription}</p>
                        <div className="arrow-r" onClick={handleNextShop}></div>
                        <ProductImage currentProduct={groceries[currentShopIndex]} currentImage={currentImage} />
                        <Timer timer={timer} />
                        <ImageCount currentShopIndex={currentShopIndex} totalAmount={totalAmount} />
                    </div>
                    )
                }
        </div>
        </div>
    );
}

export default Product;