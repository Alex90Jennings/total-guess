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
import { getGameOfTheDay, isoDate } from '../data/dailyGame';
import { hasPlayed, saveResult } from '../api/stats';
import { newlyEarned } from '../data/badges';
import { ModalToDisplay } from '../App';

const MAX_ERROR = 35;

function MainGamePage() {
    const { loggedInUser, stats, setStats, setBreakdown, setModalToDisplay, setNewBadges } = useContext(AppContext);
    const navigate = useNavigate();
    const gameDate = useRef('');
    const [game, setGame] = useState({});
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const itemPricesRef = useRef([]);
    const cumulativeTotal = itemPricesRef.current.reduce((sum, item) => sum + item.guess, 0);
    const correctPrice = game?.items?.reduce((sum, item) => sum + (item?.price || 0), 0);

    // The basket is generated locally from the date, so there is nothing to fetch.
    useEffect(() => {
        const today = isoDate();
        if (hasPlayed(stats, today)) {
            setModalToDisplay(ModalToDisplay.ALREADY_PLAYED);
            navigate('/');
            return;
        }
        const todaysGame = getGameOfTheDay();
        gameDate.current = today;
        setGame(todaysGame);
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
        } else {
            const newIndex = currentShopIndex + 1
            setCurrentShopIndex(newIndex);
        }
    };

    const handleGuessSubmit = async () => {
        const numericGuess = itemPricesRef.current.reduce((sum, price) => sum + price.guess, 0);
        const difference = Math.abs(correctPrice - numericGuess);
        let percentageError = (difference / correctPrice) * 100 * (numericGuess < correctPrice ? -1 : 1);
        percentageError = Math.max(Math.min(percentageError, MAX_ERROR), -MAX_ERROR);
        percentageError = parseFloat(percentageError.toFixed(2));

        let gained = [];
        try {
            const before = stats?.badges ?? [];
            const updated = await saveResult(loggedInUser?.$id, stats?.$id, gameDate.current, percentageError);
            setStats(updated);
            gained = newlyEarned(before, updated?.badges ?? []);
        } catch {
            setModalToDisplay(ModalToDisplay.GENERAL_ERROR);
        }

        setBreakdown(itemPricesRef.current);
        navigate('/results', { state: { numericGuess, difference, percentageError, correctPrice } });

        if (gained.length) {
            setNewBadges(gained);
            setModalToDisplay(ModalToDisplay.NEW_BADGE_EARNED);
        }
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
                                <DateAndGameNumber gameNumber={game.gameNumber} />
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
