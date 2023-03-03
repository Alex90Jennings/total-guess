import React from 'react';
import '../styles/game.css'
import Header from './Header';
import Footer from './Footer';
import Product from './Product';

function MainGamePage() {
    return (
        <div>
            <Header />
            <main id="main">
            <Product />
            </main>
            <Footer />          
        </div>
    );
}

export default MainGamePage;
