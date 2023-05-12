import React from 'react';
import '../styles/game.css';

function ProductImage({ currentImage }) {

    return (
        <div className='three-columns-expand-one-three'>
            <div></div>
            <img src={currentImage} alt="product" className="product-image pd-m" />
            <div></div>
        </div>
    );
}

export default ProductImage;