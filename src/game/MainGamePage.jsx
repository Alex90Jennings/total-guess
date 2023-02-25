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
                    <div className="box box-1">Sainsbury's</div>
                    <div className="box box-2">Tesco</div>
                    <div className="box box-3">Aldi</div>
                    <div className="box box-4">Asda</div>
                    <div className="box box-5">Coop</div>
                    <div className="box box-6">Iceland</div>
                    <div className="box box-7">Morrisons</div>
                    <div className="box box-8">Waitrose</div>
                    <div className="box box-9">MS</div>
                    <div className="box box-10">Lidl</div>
                </div>
            </main>
            <Footer />          
        </div>
    );
}

export default MainGamePage;