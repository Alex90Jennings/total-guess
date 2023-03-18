
import React, { useState } from 'react';
import '../styles/game.css'
import Product from './Product';
import Submit from './Submit'


function MainGamePage({ setGuess }) {
    const [readyToSubmit, setReadyToSubmit] = useState(false)

    return (
        <main id="main">
            {
                readyToSubmit ?
                    <Submit setGuess={setGuess}/> :
                    <Product setReadyToSubmit={setReadyToSubmit}/>
            }
        </main>        
    );
}

export default MainGamePage;
