import React from 'react';
import { storeFor } from '../data/stores';

/** A small store tag with the store's own colour as a dot. */
const ProductHeader = ({ currentShop }) => {
    const store = storeFor(currentShop);

    return (
        <span className="store-tag">
            <span className="store-tag__dot" style={{ background: store.colour }} />
            {store.name}
        </span>
    );
};

export default ProductHeader;
