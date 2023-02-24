import React from 'react';
import '../styles/game.css'
import Header from './Header';
import Footer from './Footer';

function MainGamePage() {
    return (
        <div>
            <Header />
            <main id="main">
                <div className="main--layout">
                    <div class="box box-1">Sainsbury's</div>
                    <div class="box box-2">Tesco</div>
                    <div class="box box-3">Aldi</div>
                    <div class="box box-4">Asda</div>
                    <div class="box box-5">Coop</div>
                    <div class="box box-6">Iceland</div>
                    <div class="box box-7">Morrisons</div>
                    <div class="box box-8">Waitrose</div>
                    <div class="box box-9">MS</div>
                    <div class="box box-10">Lidl</div>
                </div>
            </main>
            <Footer />          
        </div>
    );
}

export default MainGamePage;