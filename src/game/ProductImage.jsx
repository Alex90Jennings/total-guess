import React from 'react';
import '../styles/game.css';

//TODO: Add loading spinning for when product is loading, make the same height and width as the image

function ProductImage({ currentImage }) {

    return (
        <div className='three-columns-expand-one-three'>
            <div></div>
            <img 
                src={currentImage} 
                alt="product" 
                className="product-image pd-m"
                onError={(event) => {
                    event.target.src = '/icons/not-found.png';
                }} 
            />
            <div></div>
        </div>
    );
}

export default ProductImage;