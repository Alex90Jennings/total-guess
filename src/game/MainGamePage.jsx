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
            const currentDate = new Date();
            const formattedDate = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
            const response = await clientApi.fetchTodayGame(formattedDate);
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
                    <Product products={game.items} date={game.date} setReadyToSubmit={setReadyToSubmit} setTotalPrice={setTotalPrice} /> 
            }
        </main>        
    );
}

export default MainGamePage;
