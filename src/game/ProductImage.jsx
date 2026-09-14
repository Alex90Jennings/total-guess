import React from 'react';

function ProductImage({ currentImage, description }) {
    return (
        <img
            key={currentImage}
            src={`/items/${currentImage}.jpg`}
            alt={description || 'product'}
            className="play-image"
            onError={(event) => {
                event.target.src = '/icons/not-found.png';
            }}
        />
    );
}

export default ProductImage;
