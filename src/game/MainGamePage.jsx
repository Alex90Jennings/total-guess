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

    const fetchGame = async () => {
        try {
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
            const response = await clientApi.fetchTodayGame(formattedDate);
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
                    <Submit guess={guess} setGuess={setGuess} correctPrice={correctPrice} /> :
                    <Product products={game.items} date={game.date} setReadyToSubmit={setReadyToSubmit} /> 
            }
        </main>        
    );
}

export default MainGamePage;
