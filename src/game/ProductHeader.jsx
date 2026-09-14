import React from 'react';

const STORES = {
    aldi: { name: 'ALDI', colour: '#00205B' },
    asda: { name: 'ASDA', colour: '#78BE20' },
    coop: { name: 'Co-op', colour: '#00B1E7' },
    iceland: { name: 'Iceland', colour: '#D2212E' },
    lidl: { name: 'LIDL', colour: '#0050AA' },
    mands: { name: 'M&S', colour: '#1F1F1F' },
    morrisons: { name: 'Morrisons', colour: '#00563F' },
    sainsburys: { name: "Sainsbury's", colour: '#F06C00' },
    tesco: { name: 'TESCO', colour: '#00539F' },
    waitrose: { name: 'Waitrose', colour: '#5D8A2E' },
};

/** A small store tag with the store's own colour as a dot. */
const ProductHeader = ({ currentShop }) => {
    const store = STORES[currentShop] ?? { name: currentShop, colour: 'var(--ink-faint)' };

    return (
        <span className="store-tag">
            <span className="store-tag__dot" style={{ background: store.colour }} />
            {store.name}
        </span>
    );
};

export default ProductHeader;
