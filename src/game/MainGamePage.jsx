/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/game.css';
import ProductImage from './ProductImage';
import ProductHeader from './ProductHeader';
import Numpad from './Numpad';
import NarrowScreenTotals from './NarrowScreenTotals';
import DateAndGameNumber from './DateAndGameNumber';
import WideScreenInput from './WideScreenInput';
import { AppContext } from "../hooks/context";
import { lambda } from '../api/lambda';
import { ModalToDisplay } from '../App';

function MainGamePage() {
    const { loggedInUser, setLoggedInUser, isMuted, setBreakdown, selectedGameMode, setModalToDisplay } = useContext(AppContext);
    const navigate = useNavigate();
    const gameDate = useRef('');
    const [game, setGame] = useState({});
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [audio] = useState(new Audio('/Sounds/swoosh.mp3'));
    const [audioCoins] = useState(new Audio('/Sounds/coins.mp3'));
    const [inputValue, setInputValue] = useState("");
    const itemPricesRef = useRef([]);
    const cumulativeTotal = itemPricesRef.current.reduce((sum, item) => sum + item.guess, 0);
    const correctPrice = game?.items?.reduce((sum, item) => sum + (item?.price || 0), 0);

    const fetchGame = async () => {
        if(!loggedInUser._id) {
            const gamesPlayed = JSON.parse(localStorage.getItem("tgGamesPlayed")) || [];
            const hasPlayed = hasGuestAlreadyPlayed(gamesPlayed)
            if(hasPlayed) throw new Error('Guest already played')
        }
        try {
            const response = await lambda.getGameOfTheDay(selectedGameMode)
            gameDate.current = response.date;
            setGame(response);
        } catch (error) {
            console.error('Error fetching game:', error);
            navigate('/')
            setModalToDisplay(ModalToDisplay.ALREADY_PLAYED)
        }
    };

    const hasGuestAlreadyPlayed = (gamesPlayed) => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1);
        if(gamesPlayed.includes(yesterday)) {
            return true
        }
        return false
    }

    useEffect(() => {
        if(!loggedInUser._id) {
            setModalToDisplay(ModalToDisplay.NOT_SIGNED_IN)
            localStorage.removeItem('tgJwtToken')
        }
        fetchGame();
    }, []);

    if (!game?.items || itemPricesRef.current.length === 10) {
        return <div className="lds-roller"><div/><div/><div/><div/><div/><div/><div/><div/></div>
    }

    const currentProduct = game?.items[currentShopIndex];
    const currentShop = currentProduct.store;
    const currentDescription = currentProduct.description;
    const currentImage = currentProduct.image;
    const lastItem = currentShopIndex === game?.items?.length - 1;
    const firstItem = currentShopIndex === 0;
    
    const decrementItemIndex = () => {
        if (firstItem) return
        if (!isMuted) audio.play();
        const newIndex = currentShopIndex - 1;
        setCurrentShopIndex(newIndex);
        itemPricesRef.current = itemPricesRef.current.slice(0, itemPricesRef.current.length - 1);
        return;
    }

    const handleItemWorthSubmit = () => {
        if(inputValue.trim() === "" || inputValue.trim() === "£") {
            return
        }
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

        if (lastItem) {
            handleGuessSubmit();
            if (!isMuted) audioCoins.play();
        } else {
            if (!isMuted) audio.play();
            const newIndex = currentShopIndex + 1
            setCurrentShopIndex(newIndex);
        }
    };

    const handleGuessSubmit = async () => {
        if(loggedInUser?.hasPlayedDaily) {
            navigate('/')
            setModalToDisplay(ModalToDisplay.ALREADY_PLAYED)
            return
        }
        
        const numericGuess = (itemPricesRef.current.reduce((sum, price) => sum + price.guess, 0));
        const difference = numericGuess <= correctPrice ? correctPrice - numericGuess : numericGuess - correctPrice;
        let percentageError = (difference / correctPrice) * 100 * (numericGuess <= correctPrice ? -1 : 1);
        if (percentageError > 35) percentageError = 35;
        if (percentageError < -35) percentageError = -35;

        if (loggedInUser?._id) {
            try {
                const response = await lambda.submitResult(loggedInUser.email, gameDate.current, percentageError, game.gameMode, itemPricesRef.current)
                setLoggedInUser(response);
                setBreakdown(itemPricesRef.current)
                if (!isMuted) audio.play();
            } catch {
                navigate('/')
                setModalToDisplay(ModalToDisplay.ALREADY_PLAYED)
                return
            } 
        } else {
            const gamesPlayed = JSON.parse(localStorage.getItem("tgGamesPlayed")) || [];
            const scores = JSON.parse(localStorage.getItem("tgScores")) || [];
            const hasPlayed = hasGuestAlreadyPlayed(gamesPlayed)
            if(hasPlayed) {
                navigate('/')
                setModalToDisplay(ModalToDisplay.ALREADY_PLAYED)
                return
            } else {
                gamesPlayed.push(gameDate.current);
                scores.push(percentageError);
                localStorage.setItem("tgGamesPlayed", JSON.stringify(gamesPlayed));
                localStorage.setItem("tgScores", JSON.stringify(scores));
                setBreakdown(itemPricesRef.current)
            }
        }
        navigate('/results', { state: { numericGuess, difference, percentageError, correctPrice } });
    };

    return (
        <main id="main">
            <section className="three-rows-expand-one-three">
                <div/>
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
                                        decrementItemIndex={decrementItemIndex}
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
                                <DateAndGameNumber currentProductDate={currentProduct.date} gameDate={game.date} />
                            </div>
                        )
                    }
                </article>
                <div/>
            </section>
        </main>
    );
}

export default MainGamePage;