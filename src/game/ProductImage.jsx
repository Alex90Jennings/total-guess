import React from 'react';

function ProductImage({ currentImage, description, attribution }) {
    // Photographed items ship with the app as /items/<code>.jpg; catalogue
    // products carry a full URL and a licence that requires the credit below.
    const source = /^https?:\/\//.test(currentImage) ? currentImage : `/items/${currentImage}.jpg`;

    return (
        <>
            <img
                key={currentImage}
                src={source}
                alt={description || 'product'}
                className="play-image"
                onError={(event) => {
                    event.target.src = '/icons/not-found.png';
                }}
            />
            {attribution && <p className="play-image-credit">{attribution}</p>}
        </>
    );
}

export default ProductImage;
