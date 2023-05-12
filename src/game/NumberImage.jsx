import { groceries } from '../consts/hardcodedcodedData';

function NumberImage({ number, currentShopIndex }) {

    const imagePath =
        currentShopIndex === undefined
            ? `/Numbers/${number}.png`
            : `/Shops/${groceries[currentShopIndex].shop.replace(/ /g, "")}/${groceries[currentShopIndex].description.replace(/ /g, "")}/${number}.png`;

    return <img src={imagePath} alt={number} />;
}

export default NumberImage;