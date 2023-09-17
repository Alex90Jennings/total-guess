/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/game.css';
import ProductImage from './ProductImage';
import { AppContext } from "../hooks/context";
import { clientApi } from '../api/clientApi';

function MainGamePage() {
    const { loggedInUser, setLoggedInUser, gameDate, isMuted, setGameDate, setBreakdown, selectedGameMode } = useContext(AppContext);
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
            const response = await clientApi.fetchTodayGame(selectedGameMode);
            setGame(response.data);
            setGameDate(response.data.date);
        } catch (error) {
            console.error('Error fetching game:', error);
        }
    };

    useEffect(() => {
        fetchGame();
    }, []);

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
        let inputValue = event?.target?.value || event;

        if(inputValue === '⌫') {
            if(inputValue.length > 0) setInputValue(inputValue.slice(0, -1))
            return
        }

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

    const handleNumPadPress = (num) => {
        if(num === '⌫') {
            if(inputValue.length > 0) setInputValue(inputValue.slice(0, -1))
            return
        }

        if(inputValue && inputValue.includes('.') && inputValue.split('.')[1].length >= 2) {
            return
        }

        let newNumber = `${inputValue}${num}`
    
        if (!newNumber.startsWith('£')) {
            newNumber = '£' + newNumber;
        }
    
        const numericValue = parseFloat(newNumber.substring(1));
    
        if (!isNaN(numericValue) && numericValue > 99) {
            newNumber = '£99.99';
        }

        setInputValue(newNumber);
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
            const response = await clientApi.submitResult(loggedInUser.email, gameDate, percentageError, game.gameMode);
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
            <section className="three-rows-expand-one-three">
                <div></div>
                <article className="main--layout">
                    {
                        currentProduct && (
                            <div className="box">
                                <ProductHeader currentShop={currentShop} />
                                <div className="description--css mt-s">{currentDescription}</div>
                                <ProductImage currentImage={currentImage} />
                                <div className='input-container-wide-screen'>
                                    <WideScreenInput 
                                        currentShopIndex={currentShopIndex} 
                                        gameLength={game?.items?.length} 
                                        inputValue={inputValue} 
                                        cumulativeTotal={cumulativeTotal} 
                                        setInputValue={setInputValue}
                                        handleItemWorthSubmit={handleItemWorthSubmit}
                                    />
                                </div>
                                <div className='input-container-narrow-screen'>
                                    <NarrowScreenTotals currentShopIndex={currentShopIndex} gameLength={game?.items?.length} inputValue={inputValue} cumulativeTotal={cumulativeTotal} />
                                    <Numpad 
                                        inputValue={inputValue} 
                                        setInputValue={setInputValue} 
                                        lastItem={lastItem} 
                                        firstItem={firstItem} 
                                        decrementItemIndex={decrementItemIndex} 
                                        handleItemWorthSubmit={handleItemWorthSubmit}
                                    />
                                </div>
                            </div>
                        )
                    }
                </article>
                <div></div>
            </section>
        </main>
    );
}

export default MainGamePage;