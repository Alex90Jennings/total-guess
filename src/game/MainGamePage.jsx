import React, { useState, useEffect } from 'react';
import '../styles/game.css';
import Product from './Product';
import Submit from './Submit';
import { clientApi } from '../api/clientApi';

function MainGamePage({ setGuess }) {
    
    const [readyToSubmit, setReadyToSubmit] = useState(false);
    const [totalPrice, setTotalPrice] = useState(0); 
    const [game, setGame] = useState({});

    const fetchGame = async () => {
        try {
            const response = await clientApi.fetchTodayGame();
            setGame(response.data);
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
                    <Submit setGuess={setGuess} correctPrice={totalPrice} /> :
                    <Product products={game.items} setReadyToSubmit={setReadyToSubmit} setTotalPrice={setTotalPrice} /> 
            }
        </main>        
    );
}

export default MainGamePage;
