import React from 'react';

const ProductHeader = ({ currentShop }) => {

    const shouldBeBold = ['asda', 'tesco', 'morrisons', 'aldi', 'spar', 'lidl', 'coop'];
    const shouldBeAllCaps = ['asda', 'tesco', 'aldi', 'spar', 'mands', 'lidl'];
    
    const correctShopName = (shopName) => {
        if (shopName === 'coop') return shopName;
        if (shopName === 'sainsburys') return "Sainsbury's";
        let nameToReturn = shouldBeAllCaps.includes(shopName)
            ? shopName.toUpperCase()
            : shopName[0].toUpperCase() + shopName.slice(1).toLowerCase();
        return nameToReturn;
    };

    return (
        <div className="shop--css three-rows-expand-one-three">
        <div></div>
        {currentShop === "mands" ? (
            <h1 className='normal-font pt-s'>M&S</h1>
        ) : (
            <h1 className={shouldBeBold.includes(currentShop) ? 'bold' : 'normal-font'}>
                {correctShopName(`${currentShop}`)}
            </h1>
        )}
        <div></div>
    </div>
    );
};

export default ProductHeader;
