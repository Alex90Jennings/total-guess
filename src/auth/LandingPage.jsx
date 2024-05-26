import { useState, useEffect, useContext } from 'react';
import '../styles/landingPage.css'
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

    useEffect(
        () => {
            if (isAuthenticated) setElementToDisplay('landingPageMenu')
        }, 
        [isAuthenticated]
    );

    if(isLoading || fetchingLoggedInUser) {
        return <div className="lds-roller"><div/><div/><div/><div/><div/><div/><div/><div/></div>
    }

    return (
        <div className='landing-page three-rows-expand-two'>
            <LandingPageHeader hideHeaders={!formData.isRegistered} />
            <div/>
            { elementToDisplay === 'landingPageMenu' && <LandingPageMenu setElementToDisplay={setElementToDisplay} setFormData={setFormData} formData={formData} /> }
            { elementToDisplay === 'loginForm' && <LoginForm setElementToDisplay={setElementToDisplay} setIsLoading={setIsLoading} setFormData={setFormData} formData={formData} /> }
        </div>
    );
}

export default LandingPage;
