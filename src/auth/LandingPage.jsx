import { useState, useEffect } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';

function LandingPage({ isAuthenticated, setIsAuthenticated, setShowModal, setFirstName, firstName }) {
    const [showLoginPage, setShowLoginPage] = useState(false);
    const [hideHeaders, setHideHeaders] = useState(false);
    const [showLandingPageContent, setShowLandingPageContent] = useState(true); 
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
      if (isAuthenticated) {
    setShowLoginPage(false);
    setShowLandingPageContent(true);
    setHideHeaders(false)
    }
    }, [isAuthenticated]);

    return (
        <div className='landing-page three-rows-expand-two'>
            <LandingPageHeader 
                hideHeaders={hideHeaders}
                setShowLoginPage={setShowLoginPage} 
                setShowLandingPageContent={setShowLandingPageContent} 
                isAuthenticated={isAuthenticated}
                firstName={firstName}
            />
            <div></div>
            {
                showLandingPageContent && !showLoginPage && (
                    <LandingPageMenu
                        setShowLoginPage={setShowLoginPage}
                        setShowLandingPageContent={setShowLandingPageContent}
                        setShowModal={setShowModal}
                        setFirstName={setFirstName}
                        setIsAuthenticated={setIsAuthenticated}
                        isAuthenticated={isAuthenticated}
                        isGuest={isGuest}
                        setIsGuest={setIsGuest}
                        />
                )
            }
            {
                showLoginPage && (
                    <LoginForm 
                        setIsAuthenticated={setIsAuthenticated} 
                        setShowLoginPage={setShowLoginPage}
                        hideHeaders={hideHeaders}
                        setHideHeaders={setHideHeaders}
                        setFirstName={setFirstName}
                        isGuest={isGuest}
                        setIsGuest={setIsGuest}
                    />
                )
            }
        </div>
    );
}

export default LandingPage;
