import { useState, useEffect, useContext } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';
import { AppContext } from '../hooks/context';

function LandingPage() {

    const { isAuthenticated } = useContext(AppContext);
    const [ hideHeaders, setHideHeaders ] = useState(false)
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
    
    return (
        <div className='landing-page three-rows-expand-two'>
            <LandingPageHeader 
                setShowLoginPage={setShowLoginPage} 
                setShowLandingPageContent={setShowLandingPageContent} 
                hideHeaders={hideHeaders}
            />
            <div></div>
            {
                showLandingPageContent && !showLoginPage && (
                    <LandingPageMenu
                        setShowLoginPage={setShowLoginPage}
                        setShowLandingPageContent={setShowLandingPageContent}
                    />
                )
            }
            {
                showLoginPage && (
                    <LoginForm
                        setShowLandingPageContent={setShowLandingPageContent}
                        setShowLoginPage={setShowLoginPage}
                        hideHeaders={hideHeaders}
                        setHideHeaders={setHideHeaders}
                    />
                )
            }
        </div>
    );
}

export default LandingPage;
