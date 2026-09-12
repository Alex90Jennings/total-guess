import React from 'react';
import '../styles/game.css';

function ProductImage({ currentImage }) {

    return (
        <section className='three-columns-expand-one-three'>
            <div/>
            <img 
                src={`/items/${currentImage}.jpg`}
                alt="product" 
                className="product-image"
                onError={(event) => {
                    event.target.src = '/icons/not-found.png';
                }} 
            />
            <div/>
        </section>
    );
}

export default ProductImage;