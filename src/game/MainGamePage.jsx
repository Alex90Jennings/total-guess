/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/game.css';
import '../styles/play.css';
import ProductImage from './ProductImage';
import ProductHeader from './ProductHeader';
import Numpad from './Numpad';
import NarrowScreenTotals from './NarrowScreenTotals';
import DateAndGameNumber from './DateAndGameNumber';
import WideScreenInput from './WideScreenInput';
import { AppContext } from "../hooks/context";
import { isoDate } from '../data/dailyGame';
import { fetchGameOfTheDay } from '../api/dailyGame';
import { hasPlayed, saveResult } from '../api/stats';
import { newlyEarned } from '../data/badges';
import { percentageError as calculateError, totalOf } from './scoring';
import { ModalToDisplay } from '../App';


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

    // The basket is the published game for today, or this browser's cached copy
    // of it. There is no locally generated alternative: every player on a given
    // date must get the same ten items.
    useEffect(() => {
        let cancelled = false;
        const today = isoDate();
        if (hasPlayed(stats, today)) {
            setModalToDisplay(ModalToDisplay.ALREADY_PLAYED);
            navigate('/');
            return undefined;
        }
        fetchGameOfTheDay().then((todaysGame) => {
            if (cancelled) return;
            if (!todaysGame) {
                // Today's published game could not be reached. Say so rather than
                // playing a different basket from everybody else.
                setModalToDisplay(ModalToDisplay.GENERAL_ERROR);
                navigate('/');
                return;
            }
            gameDate.current = today;
            setGame(todaysGame);
        });
        return () => { cancelled = true; };
    }, []);

    if (!game?.items || itemPricesRef.current.length === 10) {
        return <div className="lds-roller"><div/><div/><div/><div/><div/><div/><div/><div/></div>
    }

    const currentProduct = game?.items[currentShopIndex];
    const currentShop = currentProduct.store;
    const currentDescription = currentProduct.description;
    const currentImage = currentProduct.image;
    const nextProduct = game?.items?.[currentShopIndex + 1];
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
            const scoredItem = game.items[currentShopIndex];
            itemPricesRef.current = [...itemPricesRef.current, {
                itemId: scoredItem._id,
                guess: roundedItemWorth,
                correctPrice: scoredItem.price,
                description: scoredItem.description,
                // Where the price came from, shown only after the answer is revealed.
                store: scoredItem.store,
                priceKind: scoredItem.priceKind,
                priceObservedOn: scoredItem.priceObservedOn
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
        const numericGuess = totalOf(itemPricesRef.current, 'guess');
        const difference = Math.abs(correctPrice - numericGuess);
        const percentageError = calculateError(numericGuess, correctPrice);

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
        <main id="main" className="play-main">
            {nextProduct && (
                <link
                    rel="preload"
                    as="image"
                    href={nextProduct._id?.startsWith('off:')
                        ? `/off/${nextProduct._id.slice(4)}.jpg`
                        : `/items/${nextProduct.image}.jpg`}
                />
            )}
            {currentProduct && (
                <div className="play">
                    <DateAndGameNumber
                        gameNumber={game.gameNumber}
                        currentShopIndex={currentShopIndex}
                        gameLength={game?.items?.length}
                    />
                    <div className="play-body">
                        <div className="play-media">
                            <ProductImage
                                item={currentProduct}
                                currentImage={currentImage}
                                description={currentDescription}
                                attribution={currentProduct.imageAttribution}
                            />
                        </div>
                        <div className="play-panel">
                            <ProductHeader currentShop={currentShop} />
                            <h1 className="play-title">{currentDescription}</h1>
                            {currentProduct.quantity && (
                                <p className="play-quantity">{currentProduct.quantity}</p>
                            )}
                            <div className="play-controls--wide">
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
                            <div className="play-controls--narrow">
                                <NarrowScreenTotals inputValue={inputValue} cumulativeTotal={cumulativeTotal} />
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
                    </div>
                </div>
            )}
        </main>
    );
}

export default MainGamePage;
