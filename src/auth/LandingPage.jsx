import { useState, useEffect, useContext } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';
import { AppContext } from '../hooks/context';

function LandingPage({ setShowModal }) {

    const { isAuthenticated, setHideHeaders } = useContext(AppContext);

    const [showLoginPage, setShowLoginPage] = useState(false);
    const [showLandingPageContent, setShowLandingPageContent] = useState(true); 

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
            />
            <div></div>
            {
                showLandingPageContent && !showLoginPage && (
                    <LandingPageMenu
                        setShowLoginPage={setShowLoginPage}
                        setShowLandingPageContent={setShowLandingPageContent}
                        setShowModal={setShowModal}
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
