import { useState } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';

function LandingPage({ isAuthenticated, setIsAuthenticated, setShowModal }) {
    const [showLoginPage, setShowLoginPage] = useState(false)
    const [hideHeaders, setHideHeaders] = useState(false)

    return (
        <div className='landing-page three-rows-expand-two'>
            <LandingPageHeader 
                hideHeaders={hideHeaders}
            />
            <div></div>
            {
                !showLoginPage && (
                    <LandingPageMenu 
                        isAuthenticated={isAuthenticated} 
                        setIsAuthenticated={setIsAuthenticated} 
                        setShowLoginPage={setShowLoginPage} 
                        setShowModal={setShowModal} 
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
                    />
                )
            }
        </div>
    );
}

export default LandingPage;
