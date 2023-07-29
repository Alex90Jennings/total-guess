import React, { useState, useContext } from 'react';
import '../styles/game.css';
import ProductImage from './ProductImage';
import { AppContext } from "../hooks/context";

function Product({ setReadyToSubmit, products, date }) {
    const { isMuted } = useContext(AppContext);
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [audio] = useState(new Audio('/Sounds/swoosh.mp3'));
    const [audioCoins] = useState(new Audio('/Sounds/coins.mp3'));
    const [inputValue, setInputValue] = useState("");
    const [itemPrices, setItemPrices] = useState([]);
    const cumulativeTotal = itemPrices.reduce((sum, price) => sum + price, 0).toFixed(2);
    const shouldBeBold = ['asda', 'tesco', 'morrisons', 'aldi', 'spar', 'lidl', 'coop'];
    const shouldBeAllCaps = ['asda', 'tesco', 'aldi', 'spar', 'mands', 'lidl'];

    //TODO: get loading spinner
    if (!products) {
        return <div>Loading...</div>;
    }

    const currentProduct = products[currentShopIndex];
    const currentShop = currentProduct.store;
    const currentDescription = currentProduct.description;
    const currentImage = currentProduct.image;

    // const getBrandClassname = (classNames) => {
    //     return classNames.replace('{brand}', currentProduct.store);
    // };

    const correctShopName = (shopName) => {
        if (shopName === 'coop') return shopName;
        if (shopName === 'sainsburys') return "Sainsbury's";
        let nameToReturn = shouldBeAllCaps.includes(shopName)
            ? shopName.toUpperCase()
            : shopName[0].toUpperCase() + shopName.slice(1).toLowerCase();
        return nameToReturn;
    };

    const decrementItemIndex = () => {
        if (currentShopIndex === 0) return

        if (!isMuted) audio.play();
        const newIndex = currentShopIndex - 1;
        setCurrentShopIndex(newIndex);
        setItemPrices((prevPrices) => prevPrices.slice(0, prevPrices.length - 1));
        return;
    }

    const handleInputChange = (event) => {
        let inputValue = event.target.value;

        inputValue = inputValue.replace(/[^0-9.]/g, '');
    
        if (!inputValue.startsWith('£')) {
            inputValue = '£' + inputValue;
        }
    
        const numericValue = parseFloat(inputValue.substring(1));
    
        if (!isNaN(numericValue) && numericValue > 99) {
            inputValue = '£99.99';
        }

        setInputValue(inputValue);
    };

    const handleItemWorthSubmit = () => {
        const itemWorth = parseFloat(inputValue.replace(/[^0-9.]/g, ''));

        if (!isNaN(itemWorth)) {
            const roundedItemWorth = parseFloat(itemWorth.toFixed(2));
            setItemPrices((prevPrices) => [...prevPrices, roundedItemWorth]);
            setInputValue("");
        }
        if (currentShopIndex === products.length - 1) {
            setReadyToSubmit({ itemPrices: [...itemPrices, itemWorth] });
            if (!isMuted) audioCoins.play();
        } else {
            if (!isMuted) audio.play();
            const newIndex = currentShopIndex + 1
            setCurrentShopIndex(newIndex);
        }
    };

    const handleInputKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleItemWorthSubmit();
        }
    };

    function getDateString(date) {
        const d = new Date(date);
        const day = ("0" + d.getDate()).slice(-2);
        const month = ("0" + (d.getMonth() + 1)).slice(-2);
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function getDaysSince() {
        const targetDate = new Date('2023-07-01');
        const givenDate = new Date(date);

        const timeDiff = Math.abs(givenDate.getTime() - targetDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    }

    return (
        <div className="three-rows-expand-one-three">
            <div></div>
            <div className="main--layout">
                {currentProduct && (
                    <div className="box">
                        <div className="shop--css three-rows-expand-one-three">
                            <div></div>
                            {currentShop === "mands" ? (
                                <h1 className='normal-font pt-s'>M<span className='mands-accent-css'>&</span>S</h1>
                            ) : (
                                <h1 className={shouldBeBold.includes(currentShop) ? 'bold' : 'normal-font'}>
                                    {correctShopName(`${currentShop}`)}
                                </h1>
                            )}
                            <div></div>
                        </div>
                        <div className="description--css mt-s">{currentDescription}</div>
                        <ProductImage currentImage={currentImage} />
                        <p className='item-count'><span className='item-count-accent'>{currentShopIndex + 1}</span>/{products.length}</p>
                        <p className='sub-total'>Sub Total: £{cumulativeTotal}</p>
                        <div className="input-container mt-s">
                            <div></div>
                            <div className='five-columns-expand-two-four'>
                                <button id='back-item-button' disabled={currentShopIndex === 0} onClick={() => decrementItemIndex()}>Back</button>
                                <div></div>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Enter £ value"
                                    className='value-input'
                                />
                                <div></div>
                                <button id={currentShopIndex === products.length - 1 ? 'submit-final-item-button' : 'submit-item-button'} onClick={() => handleItemWorthSubmit()}>Submit</button>
                            </div>
                        </div>
                        <div className="info-container">
                            <div className="info-column">
                                <p className="date">{getDateString(currentProduct.date)}</p>
                            </div>
                            <div className="info-column text-right">
                                <p className="game">#{getDaysSince()}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div></div>
        </div>
    );
}

export default Product;