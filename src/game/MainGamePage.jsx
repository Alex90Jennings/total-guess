/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/game.css';
import ProductImage from './ProductImage';
import { AppContext } from "../hooks/context";
import { clientApi } from '../api/clientApi';

function MainGamePage() {
    const { loggedInUser, setLoggedInUser, gameDate, isMuted, setGameDate, setBreakdown } = useContext(AppContext);
    const navigate = useNavigate();
    const [game, setGame] = useState({});
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [audio] = useState(new Audio('/Sounds/swoosh.mp3'));
    const [audioCoins] = useState(new Audio('/Sounds/coins.mp3'));
    const [inputValue, setInputValue] = useState("");
    const itemPricesRef = useRef([]);
    const cumulativeTotal = itemPricesRef.current.reduce((sum, item) => sum + item.guess, 0);
    const shouldBeBold = ['asda', 'tesco', 'morrisons', 'aldi', 'spar', 'lidl', 'coop'];
    const shouldBeAllCaps = ['asda', 'tesco', 'aldi', 'spar', 'mands', 'lidl'];
    const correctPrice = game?.items?.reduce((sum, item) => sum + (item?.price || 0), 0);

    const fetchGame = async () => {
        try {
            const response = await clientApi.fetchTodayGame();
            setGame(response.data);
            setGameDate(response.data.date);
        } catch (error) {
            console.error('Error fetching game:', error);
        }
    };

    useEffect(() => {
        fetchGame();
    }, []);
    
    //TODO: get loading spinner
    if (!game?.items || itemPricesRef.current.length === 10) {
        return <div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    }

    const currentProduct = game?.items[currentShopIndex];
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
        itemPricesRef.current = itemPricesRef.current.slice(0, itemPricesRef.current.length - 1);
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
            itemPricesRef.current = [...itemPricesRef.current, { 
                itemId: game.items[currentShopIndex]._id, 
                guess: roundedItemWorth,
                correctPrice: game.items[currentShopIndex].price,
                description: game.items[currentShopIndex].description
            }];
            setInputValue("");
        }
        if (currentShopIndex === game?.items?.length - 1) {
            handleGuessSubmit();
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

    const handleGuessSubmit = async () => {
        const numericGuess = (itemPricesRef.current.reduce((sum, price) => sum + price.guess, 0));
        const difference = numericGuess <= correctPrice ? correctPrice - numericGuess : numericGuess - correctPrice;
        let percentageError = (difference / correctPrice) * 100 * (numericGuess <= correctPrice ? -1 : 1);

        if (percentageError > 35) {
            percentageError = 35;
        }

        if (percentageError < -35) {
            percentageError = -35;
        }

        if (loggedInUser) {
            const response = await clientApi.submitResult(loggedInUser.email, gameDate, percentageError);
            setLoggedInUser(response.data);
            await clientApi.updateItemsGuess(itemPricesRef.current)
            setBreakdown(itemPricesRef.current)
            if (!isMuted) audio.play();
        }

        navigate('/results', { state: { numericGuess, difference, percentageError, correctPrice } });
    };

    function getDaysSince() {
        const targetDate = new Date('2023-07-01');
        const givenDate = new Date(gameDate);

        const timeDiff = Math.abs(givenDate.getTime() - targetDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    }

    return (
        <main id="main">
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
                            <p className='item-count'><span className='item-count-accent'>{currentShopIndex + 1}</span>/{game?.items?.length}</p>
                            <p className='sub-total'>Sub Total: £{cumulativeTotal.toFixed(2)}</p>
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
                                    <button id={currentShopIndex === game?.items?.length - 1 ? 'submit-final-item-button' : 'submit-item-button'} onClick={() => handleItemWorthSubmit()}>Submit</button>
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
        </main>
    );
}

export default MainGamePage;