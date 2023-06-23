import React, { useState, useContext } from 'react';
import TinderCard from 'react-tinder-card';
import '../styles/game.css';
import ProductImage from './ProductImage';
import ImageCount from './ImageCount';
import { AppContext } from "../hooks/context";

function Product({ setReadyToSubmit, products, date }) {

    const { isMuted } = useContext(AppContext);
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [audio] = useState(new Audio('/Sounds/swoosh.mp3'));
    const [audioCoins] = useState(new Audio('/Sounds/coins.mp3'));

    if (!products) {
        return <div>Loading...</div>;
    }
    
    const shouldBeBold = ['asda', 'tesco', 'morrisons', 'aldi', 'spar', 'lidl', 'coop']
    const shouldBeAllCaps = ['asda', 'tesco', 'aldi', 'spar', 'mands', 'lidl']
    const currentProduct = products[currentShopIndex];
    const totalAmount = 0;

    const getBrandClassname = (classNames) => {
        return classNames.replace('{brand}', currentProduct.store);
    };


    const correctShopName = (shopName) => {
        if (shopName === 'coop') return shopName
        if (shopName === 'sainsburys') return "Sainsbury's"
        let nameToReturn = shouldBeAllCaps.includes(shopName) ? shopName.toUpperCase() : shopName[0].toUpperCase() + shopName.slice(1).toLowerCase()
        return nameToReturn
    }

    const currentShop = currentProduct.store;
    const currentDescription = currentProduct.description;
    const currentImage = currentProduct.image;

    const handleSwipe = (direction) => {
        let newIndex;
        if (direction === 'left') {
            newIndex = currentShopIndex + 1;
        } else if (direction === 'right') {
            newIndex = currentShopIndex - 1;
        }
        if (newIndex >= 0 && newIndex < products.length) {
            setCurrentShopIndex(newIndex);
            if(!isMuted) audio.play()
        }
    };

    const handleArrowRightClick = () => {
        if (currentShopIndex === products.length - 1) {
            setReadyToSubmit(true);
            if(!isMuted) audioCoins.play()
        } else {
            handleSwipe('left');
        }
    };

    function getDateString(date) {
        const d = new Date(date);
        const day = ("0" + d.getDate()).slice(-2);
        const month = ("0" + (d.getMonth() + 1)).slice(-2);
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function getDaysSince() {
        const targetDate = new Date('2023-06-09');
        const givenDate = new Date(date);
        
        if (isNaN(givenDate)) {
          throw new Error("Invalid date format. Cannot calculate days since.");
        }
        
        const timeDiff = Math.abs(givenDate.getTime() - targetDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    }

    return (
        <div className="three-rows-expand-one-three">
            <div></div>
            <div className="main--layout">
                {
                    /*
                        <div className='three-rows-expand-one-three'>
                            <div></div>
                            <button className={getBrandClassname(`arrow arrow-left {brand}-arrow wide-screen-arrows`)} onClick={() => handleSwipe('right')}></button>
                            <div></div>
                        </div>
                    */
                }
                <div className='three-rows-expand-one-three'>
                    <div></div>
                    <button className={getBrandClassname("arrow-left nedian-bold wide-screen-arrows {brand}-arrow clear-button")} onClick={() => handleSwipe('right')}>
                        {`<`}
                    </button>
                    <div></div>
                </div>
                {currentProduct && (
                <TinderCard
                    className="tinder--card"
                    preventSwipe={['up', 'down']}
                    onSwipe={(dir) => handleSwipe(dir)}
                    key={currentShopIndex}
                >
                    <div className={getBrandClassname("box {brand}-box-css")}>
                        <div className={getBrandClassname("shop--css {brand}-header-css three-rows-expand-one-three")}>
                            <div></div>
                            {
                                currentShop === "mands" ?
                                    <h1 className='normal-font pt-s'>M<span className='mands-accent-css'>&</span>S</h1> :
                                    <h1 className={shouldBeBold.includes(currentShop) ? 'bold' : 'normal-font'}>{correctShopName(`${currentShop}`)}</h1>
                            }
                            <div></div>
                        </div>
                        <div className={getBrandClassname("description--css {brand}-description-css mt-s")}>{currentDescription}</div>
                        <div className="image-row">
                            <div className='three-rows-expand-one-three'>
                                <div></div>
                                <button className={getBrandClassname("arrow-left nedian-bold narrow-screen-arrows {brand}-arrow clear-button")} onClick={() => handleSwipe('right')}>
                                    {`<`}
                                </button>
                                <div></div>
                            </div>
                            <div className='wide-screen-count'>
                                <ImageCount
                                    currentShopIndex={currentShopIndex}
                                    totalAmount={totalAmount}
                                    getBrandClassname={getBrandClassname}
                                    start={1}
                                    end={5}
                                />
                            </div>
                            <div className='space1'></div>
                            <ProductImage currentImage={currentImage} />
                        <div className='space2'></div>
                            <div className='wide-screen-count'>
                                <ImageCount
                                    className='wide-screen-count'
                                    currentShopIndex={currentShopIndex}
                                    totalAmount={totalAmount}
                                    getBrandClassname={getBrandClassname}
                                    start={6}
                                    end={10}
                                />
                            </div>
                            <div className='three-rows-expand-one-three'>
                                <div></div>
                                <div className='three-rows-expand-one-three'>
                                    <div></div>
                                    <button className={getBrandClassname("arrow-right nedian-bold narrow-screen-arrows {brand}-arrow clear-button")} onClick={() => handleArrowRightClick()}>
                                        {`>`}
                                    </button>
                                    <div></div>
                                </div>
                                <div></div>
                            </div>
                        </div>
                        <div className='narrow-screen-count three-columns-expand-one-three'>
                            <div></div>
                            <ImageCount
                                currentShopIndex={currentShopIndex}
                                alignment={"horizontal"}
                                totalAmount={totalAmount}
                                getBrandClassname={getBrandClassname}
                                start={1}
                                end={10}
                            />
                            <div></div>
                        </div>
                        <div className={getBrandClassname("info-container {brand}-info")}>
                            <div className="info-column">
                                <p className="date">{getDateString(currentProduct.date)}</p>
                            </div>
                            <div className='space3'></div>
                                <div className="info-column text-center">
                                <p className="store">Portsmouth</p>
                            </div>
                            <div className='space4'></div>
                                <div className="info-column text-right">
                                <p className="game">#{getDaysSince()}</p>
                            </div>
                        </div>
                    </div>
                </TinderCard>
                )}
                <div className='three-rows-expand-one-three'>
                    <div></div>
                    <div className='three-rows-expand-one-three'>
                        <div></div>
                        <button className={getBrandClassname("arrow-right nedian-bold wide-screen-arrows {brand}-arrow clear-button")} onClick={() => handleArrowRightClick()}>
                            {`>`}
                        </button>
                        <div></div>
                    </div>
                    <div></div>
                </div>
            </div>
            <div></div>
        </div>
    );
}

export default Product;
