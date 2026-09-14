import { useState, useEffect, useContext } from 'react';
import '../styles/landingPage.css'
import '../styles/screens.css'
import LandingPageHeader from './LandingPageHeader';
import LandingPageMenu from './LandingPageMenu';
import LoginForm from './LoginForm';
import { AppContext } from '../hooks/context';

function LandingPage() {

    const { isAuthenticated, fetchingLoggedInUser } = useContext(AppContext);
    const [elementToDisplay, setElementToDisplay] = useState('landingPageMenu');
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        isRegistered: true,
        firstName: '',
        lastName: '',
        gender: 'PREFER_NOT_TO_SAY',
        ageRange: 'PREFER_NOT_TO_SAY',
        confirmPassword: ''
    });
    const [error, setError] = useState(null);

    useEffect(
        () => {
            if (isAuthenticated) setElementToDisplay('landingPageMenu')
        }, 
        [isAuthenticated]
    );

    if(isLoading || fetchingLoggedInUser) {
        return <div className="lds-roller"><div/><div/><div/><div/><div/><div/><div/><div/></div>
    }

    if (elementToDisplay === 'loginForm') {
        return (
            <main className="screen">
                <LoginForm setElementToDisplay={setElementToDisplay} setIsLoading={setIsLoading} setFormData={setFormData} formData={formData} setError={setError} error={error} />
            </main>
        );
    }

    return (
        <main className="screen">
            <div className='landing-page three-rows-expand-two'>
                <LandingPageHeader />
                <div/>
                <LandingPageMenu setElementToDisplay={setElementToDisplay} setFormData={setFormData} formData={formData} />
            </div>
        </main>
    );
}

export default LandingPage;
