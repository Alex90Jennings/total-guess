import React, { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';
import '../styles/game.css';
import ProductImage from './ProductImage';
import ImageCount from './ImageCount';
import { clientApi } from '../api/clientApi';

function Product({ setReadyToSubmit, setTotalPrice }) {

    const [groceries, setGroceries] = useState([]);
    const [currentShopIndex, setCurrentShopIndex] = useState(0);
    const [audio] = useState(new Audio('/Sounds/swoosh.mp3'));
    const [audioCoins] = useState(new Audio('/Sounds/coins.mp3'));
    const brand = 'coop' //!TODO: does not need to be it's own state, use groceries.store
    const shouldBeBold = ['asda', 'tesco', 'morrisons', 'aldi', 'spar', 'lidl', 'coop']
    const shouldBeAllCaps = ['asda', 'tesco', 'aldi', 'spar', 'mands', 'lidl']

    const totalAmount = 0;

    const getBrandClassname = (classNames) => {
        return classNames.replace('{brand}', brand);
    };

    useEffect(() => {
        const fetchData = async () => {
        try {
            const response = await clientApi.fetchTodayGame()
            setGroceries(response.data[0].items);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        };

        fetchData();
    }, []);

    const currentProduct = groceries[currentShopIndex];
    
    if (!currentProduct) {
        return <div>Loading...</div>;
    }

    const correctShopName = (brand) => {
        const shopName = brand.brand
        if (shopName === 'coop') return shopName
        let nameToReturn = shouldBeAllCaps.includes(shopName) ? shopName.toUpperCase() : shopName[0].toUpperCase() + shopName.slice(1).toLowerCase()
        if (shopName === 'sainsbury') nameToReturn += `'s`
        if (shopName === 'mands') nameToReturn = 'M&S'
        return nameToReturn
    }

    //const currentShop = currentProduct.shop;
    const currentDescription = currentProduct.description;
    const currentImage = groceries[currentShopIndex].image;

    const handleSwipe = (direction) => {
        let newIndex;
        if (direction === 'left') {
        newIndex = currentShopIndex + 1;
        } else if (direction === 'right') {
        newIndex = currentShopIndex - 1;
        }
        if (newIndex >= 0 && newIndex < groceries.length) {
        setCurrentShopIndex(newIndex);
        audio.play();
        }
    };

    const handleArrowRightClick = () => {
        if (currentShopIndex === groceries.length - 1) {
        const totalPrice = groceries.reduce((sum, item) => sum + item.price, 0);
        setTotalPrice(totalPrice);

        setReadyToSubmit(true);
        audioCoins.play()
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

    return (
        <div className="three-rows-expand-one-three">
            <div></div>
            <div className="main--layout">
                <div className='three-rows-expand-one-three'>
                    <div></div>
                    <button className={getBrandClassname("arrow-left wide-screen-arrows {brand}-arrow clear-button")} onClick={() => handleSwipe('right')}>
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
                            <h1 className={shouldBeBold.includes(brand) ? 'bold' : 'normal-font'}>{correctShopName({brand})}</h1>
                            <div></div>
                        </div>
                        <div className={getBrandClassname("description--css {brand}-description-css mt-s")}>{currentDescription}</div>
                        <div className="image-row">
                            <div className='three-rows-expand-one-three'>
                                <div></div>
                                <button className={getBrandClassname("arrow-left narrow-screen-arrows {brand}-arrow clear-button")} onClick={() => handleSwipe('right')}>
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
                                    <button className={getBrandClassname("arrow-right narrow-screen-arrows {brand}-arrow clear-button")} onClick={() => handleArrowRightClick()}>
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
                                <p className="store">{currentProduct.store}</p>
                            </div>
                            <div className='space4'></div>
                                <div className="info-column text-right">
                                <p className="game">#{currentProduct.game}</p>
                            </div>
                        </div>
                    </div>
                </TinderCard>
                )}
                <div className='three-rows-expand-one-three'>
                    <div></div>
                    <div className='three-rows-expand-one-three'>
                                <div></div>
                                <div className='three-rows-expand-one-three'>
                                    <div></div>
                                    <button className={getBrandClassname("arrow-right wide-screen-arrows {brand}-arrow clear-button")} onClick={() => handleArrowRightClick()}>
                                        {`>`}
                                    </button>
                                    <div></div>
                                </div>
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
