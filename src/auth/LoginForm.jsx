import { useState, useContext } from 'react';
import '../styles/landingPage.css';
import { clientApi } from '../api/clientApi';
import { AppContext } from '../hooks/context';

function LoginForm({ setShowLoginPage, setShowLandingPageContent, hideHeaders, setHideHeaders, }) {

    const { isAuthenticated, setIsAuthenticated, setLoggedInUser } = useContext(AppContext);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        isRegistered: true,
        firstName: '',
        lastName: '',
        confirmPassword: ''
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (formData.isRegistered) {
            signInUser();
        } else {
            registerUser();
        }
    };

    const signInUser = async () => {
        try {
            const response = await clientApi.login(formData.email, formData.password);
            localStorage.setItem("tgJwtToken", response.data.jwtToken);
            setLoggedInUser(response.data.user)
            setIsAuthenticated(true);
            setShowLoginPage(false);                
        } catch (err) {
            console.log(err);
            setError('Error signing in. Please check your email and password.'); 
        }
    };


    async function registerUser() {
        try {
            const response = await clientApi.register(
                formData.email,
                formData.firstName,
                formData.lastName,
                formData.password
            );
            localStorage.setItem("tgJwtToken", response.data.jwtToken);
            setLoggedInUser(response.data.user)
            setIsAuthenticated(true);
            setShowLoginPage(false);
        } catch (err) {
            console.log(err);
            setError('Error registering user. Please check your information.'); 
        }
    }

    const handleReturnToMainMenu = () => {
        setShowLoginPage(false)
        setHideHeaders(false)
        setShowLandingPageContent(true)
    }


    const handleIsRegisteredClick = () => {
        setHideHeaders(!hideHeaders)
        setFormData({ ...formData, isRegistered: !formData.isRegistered })
    }

    return (
        !isAuthenticated && (
            <div className='form'>
                <form onSubmit={handleSubmit} className={`${formData.isRegistered ? 'five-rows-expand-three' : 'eight-rows-expand-six'}`}>
                    <label>
                        {error && <p className="error">{error}</p>}
                        <div className='three-columns-expand-one-three'>
                            <div></div>
                            <span className="label-container bold">Email:</span>
                            <div></div>
                        </div>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                    </label>
                    {
                        !formData.isRegistered && (
                            <label>
                                <div className='three-columns-expand-one-three'>
                                    <div></div>
                                    <span className="label-container bold">First Name:</span>
                                    <div></div>
                                </div>
                                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            </label>
                        )
                    }
                    {
                        !formData.isRegistered && (
                            <label>
                                <div className='three-columns-expand-one-three'>
                                    <div></div>
                                    <span className="label-container bold">Last Name:</span>
                                    <div></div>
                                </div>
                                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </label>
                        )
                    }
                    <label>
                        <div className='three-columns-expand-one-three'>
                            <div></div>
                            <span className="label-container bold">Password:</span>
                            <div></div>
                        </div>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                    </label>
                    {
                        !formData.isRegistered && (
                            <label>
                                <div className='three-columns-expand-one-three'>
                                    <div></div>
                                    <span className="label-container bold">Confirm Password:</span>
                                    <div></div>
                                </div>
                                <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                            </label>
                        )
                    }
                    <div></div>
                    <div className="switch-container">
                        <span className="switch-text" onClick={handleIsRegisteredClick}>
                            {formData.isRegistered ? "Need to register?" : "Already registered?"}
                        </span>
                    </div>
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <button type="submit" className="play-btn">{formData.isRegistered ? 'Login' : 'Register'}</button>
                        <div></div>
                    </div>
                </form>
                <div className='three-columns-expand-one-three'>
                    <div></div>
                    <button className="other-btn" onClick={() => handleReturnToMainMenu()}>Return to menu</button>
                    <div></div>
                </div>
            </div>
        )
    );
}

export default LoginForm;
