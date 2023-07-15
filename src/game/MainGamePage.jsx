/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useContext } from 'react';
import '../styles/game.css';
import Product from './Product';
import Submit from './Submit';
import { clientApi } from '../api/clientApi';
import { AppContext } from '../hooks/context';

function MainGamePage({ guess, setGuess }) {
    
    const { setGameDate } = useContext(AppContext);
    const [readyToSubmit, setReadyToSubmit] = useState(false); 
    const [game, setGame] = useState({});
    const correctPrice = game?.items?.reduce((sum, item) => sum + (item?.price || 0), 0);
    const totalAmount = game?.items?.reduce((sum, item) => sum + (item?.price || 0), 0).toFixed(2);

    const fetchGame = async () => {
        try {
            const response = await clientApi.fetchTodayGame();
            setGame(response.data);
            setGameDate(response.data.date)
        } catch (error) {
            console.error('Error fetching game:', error);
        }
    };

    useEffect(
        () => {
            fetchGame();
        }, 
        [],
    );

    return (
        <main id="main">
            {
                readyToSubmit ?
                    <Submit guess={guess} setGuess={setGuess} correctPrice={correctPrice} totalAmount={totalAmount} itemPrices={readyToSubmit.itemPrices}/> :
                    <Product products={game.items} date={game.date} setReadyToSubmit={setReadyToSubmit} totalAmount={totalAmount}/> 
            }
        </main>        
    );
}

export default MainGamePage;
