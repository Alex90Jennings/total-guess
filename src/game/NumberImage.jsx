import React from 'react';

function NumberImage(props) {
  const { number } = props;
  return <img src={`/Numbers/${number}.png`} alt={number} />;
}

export default NumberImage;
