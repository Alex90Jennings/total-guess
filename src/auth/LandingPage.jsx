import React, { useState } from 'react';
import '../styles/landingPage.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';

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
                    <LoginForm setIsAuthenticated={setIsAuthenticated} setShowLoginPage={setShowLoginPage}/>
                )
            }
        </div>
    );
}

export default LandingPage;
