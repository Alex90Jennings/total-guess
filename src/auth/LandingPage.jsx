import React, { useState } from 'react';
import './landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginPage from './LoginPage';

function LandingPage({ isAuthenticated, setIsAuthenticated, setShowModal, setStartGame }) {
    const [showLoginPage, setShowLoginPage] = useState(false)

    return (
        <div className='landing-page'>
            <LandingPageHeader />
            {
                !showLoginPage && (
                    <LandingPageMenu isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} setShowLoginPage={setShowLoginPage} setShowModal={setShowModal} setStartGame={setStartGame}/> 
                )
            }
            {
                showLoginPage && (
                    <LoginPage setIsAuthenticated={setIsAuthenticated} setShowLoginPage={setShowLoginPage}/>
                )
            }
        </div>
    );
}

export default LandingPage;
