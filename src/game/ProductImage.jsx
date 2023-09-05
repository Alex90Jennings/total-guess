import React from 'react';
import '../styles/game.css';

function ProductImage({ currentImage }) {

    return (
        <div className='three-columns-expand-one-three'>
            <div></div>
            <img 
                src={`${process.env.REACT_APP_S3_URL}/groceries/${currentImage}.jpg`} 
                alt="product" 
                className="product-image"
                onError={(event) => {
                    event.target.src = '/icons/not-found.png';
                }} 
            />
            <div></div>
        </div>
    );
}

export default ProductImage;