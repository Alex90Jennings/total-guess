import { useState, useEffect, useContext } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';
import { AppContext } from '../hooks/context';

function LandingPage({ setShowModal }) {

    const { isAuthenticated, setHideHeaders, loggedInUser } = useContext(AppContext);
    const [ hasPlayedDaily, setHasPlayedDaily ] = useState(false);
    const [ showLoginPage, setShowLoginPage ] = useState(false);
    const [ showLandingPageContent, setShowLandingPageContent ] = useState(true); 

    useEffect(
        () => {
            if (isAuthenticated) {
                setShowLoginPage(false);
                setShowLandingPageContent(true);
                setHideHeaders(false)
            }
        }, 
        [isAuthenticated, setHideHeaders]
    );

    useEffect(
        () => {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            const formattedToday = today.toISOString();
            const isGameAlreadyInArray = loggedInUser?.gamesPlayed?.includes(formattedToday);
            setHasPlayedDaily(isGameAlreadyInArray);
        }, 
        [loggedInUser?.gamesPlayed],
    );
    
    return (
        <div className='landing-page three-rows-expand-two'>
            <LandingPageHeader 
                setShowLoginPage={setShowLoginPage} 
                setShowLandingPageContent={setShowLandingPageContent} 
            />
            <div></div>
            {
                showLandingPageContent && !showLoginPage && (
                    <LandingPageMenu
                        setShowLoginPage={setShowLoginPage}
                        setShowLandingPageContent={setShowLandingPageContent}
                        setShowModal={setShowModal}
                        hasPlayedDaily={hasPlayedDaily}
                    />
                )
            }
            {
                showLoginPage && (
                    <LoginForm
                        setShowLoginPage={setShowLoginPage}
                    />
                )
            }
        </div>
    );
}

export default LandingPage;
