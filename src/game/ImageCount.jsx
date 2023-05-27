import React, { useState, useEffect } from 'react';
import { toRoman } from 'roman-numerals';
import '../styles/game.css';

function ImageCount({ currentShopIndex, start, end, alignment, getBrandClassname }) {

    const [romanNumeralsToDisplay, setRomanNumeralsToDisplay] = useState([]);

    useEffect(
        () => {
            const generateRomanNumerals = () => {
            const numerals = [];
            for (let i = start; i <= end; i++) {
                numerals.push(toRoman(i));
            }
            setRomanNumeralsToDisplay(numerals);
        };
      
        generateRomanNumerals();
    }, [start, end]);

    const className = alignment === 'horizontal' ? 'image-counter mg-m ten-columns' : 'image-counter mg-m'

    return (
        <div className={className}>
            {
                romanNumeralsToDisplay.map(
                    (numeral, index) => (
                        <div key={index} className={
                                start + index - 1 <= currentShopIndex ?
                                    getBrandClassname("number-box {brand}-roman-numeral-after three-columns-expand-one-three") :
                                    getBrandClassname("number-box {brand}-roman-numeral-before three-columns-expand-one-three") 
                            }>
                            <div></div>
                            <p className='roman-numerals vertical-align'>{numeral}</p>
                            <div></div>
                        </div>
                    )
                )
            }
        </div>
    );
}

export default ImageCount;
