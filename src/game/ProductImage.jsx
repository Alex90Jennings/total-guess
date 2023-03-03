import React from 'react';
import '../styles/game.css';

function ProductImage({ currentProduct, currentImage }) {
  const imagePath = currentImage;

  return (
    <img src={imagePath} alt="Product" className="product-image" />
  );
}

export default ProductImage;


