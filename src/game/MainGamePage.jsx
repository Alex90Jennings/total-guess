import React, { useState } from 'react';
import '../styles/game.css';
import Product from './Product';
import Submit from './Submit';

function MainGamePage({ setGuess }) {
    const [readyToSubmit, setReadyToSubmit] = useState(false);
    const [totalPrice, setTotalPrice] = useState(0); // Add this line

    return (
        <main id="main">
            {
                readyToSubmit ?
                    <Submit setGuess={setGuess} correctPrice={totalPrice} /> :
                    <Product setReadyToSubmit={setReadyToSubmit} setTotalPrice={setTotalPrice} /> 
            }
        </main>        
    );
}

export default MainGamePage;
