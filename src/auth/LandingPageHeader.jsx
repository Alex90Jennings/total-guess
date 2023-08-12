import React, { useContext, useRef } from 'react';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';

function LandingPageHeader({ hideHeaders }) {
    const { selectedGameMode, setSelectedGameMode } = useContext(AppContext);
    const gameModes = [ 'groceries', 'football', 'calories']
    const selectedModeIndex = useRef(0);

    const correctImageFileName = (gameMode) => {
        if(gameMode === 'groceries') return '/icons/groceries.svg'
        return `/icons/${gameMode}.png`
    }

    const titleBasedOnGameMode = (gameMode) => {
        if(gameMode === 'football') return 'TRANSFERS'
        return gameMode.toUpperCase()
    }

    const subTitleBasedOnGameMode = (gameMode) => {
        if(gameMode === 'groceries') return 'Guess the total cost of the groceries'
        if(gameMode === 'calories') return 'Guess the total calories of the food'
        if(gameMode === 'football') return 'Guess the total cost of the football transfers'
    }

    return (
        <div id='login-header'>
            <div className='five-columns-expand-one-five'>
                <div></div>
                <div className='three-rows-expand-one-three mr-s'>
                    <div></div>
                    <div>
                    {
                            <button 
                                className='clear-button'
                                onClick={
                                    () => {
                                        if(selectedModeIndex.current !== 0) {
                                            selectedModeIndex.current--
                                            setSelectedGameMode(gameModes[selectedModeIndex.current])
                                        }
                                    }
                                }
                            >
                                <img src="/icons/arrow-left.png" style={{ height: '40px' }} alt="arrow-left" />
                            </button>
                        }
                    </div>
                    <div></div>
                </div>
                <div className='three-columns-expand-one-three trolley-icon'>
                    <div></div>
                    <img src={`${correctImageFileName(selectedGameMode)}`} alt="trolley"/>
                    <div></div>
                </div>
                <div className='three-rows-expand-one-three ml-s'>
                    <div></div>
                    <div>
                        {
                            <button 
                                className='clear-button'
                                onClick={
                                    () => {
                                        if(selectedModeIndex.current !== gameModes.length -1) {
                                            selectedModeIndex.current++
                                            setSelectedGameMode(gameModes[selectedModeIndex.current])
                                        }
                                    }
                                }
                            >
                                <img src="/icons/arrow-right.png" style={{ height: '40px' }}  alt="arrow-right" />
                            </button>
                        }
                    </div>
                    <div></div>
                </div>
                <div></div>
            </div>
            {
                !hideHeaders && (
                    <div>
                        <div className='three-columns-expand-one-three mt-xl'>
                            <div></div>
                            <div className='logo-landing'>{titleBasedOnGameMode(selectedGameMode)}</div>
                            <div></div>
                        </div>
                        <div className='three-columns-expand-one-three'>
                            <div></div>
                            <h2 className='landing-h2'>{subTitleBasedOnGameMode(selectedGameMode)}</h2>
                            <div></div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default LandingPageHeader;


