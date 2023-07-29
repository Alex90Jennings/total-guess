import { useState, useContext } from 'react';
import '../styles/landingPage.css';
import { clientApi } from '../api/clientApi';
import { AppContext } from '../hooks/context';

function LoginForm({ setShowLoginPage, setShowLandingPageContent, hideHeaders, setHideHeaders }) {

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
        } catch {
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
            localStorage.setItem("tgJwtToken", response.data.token);
            setLoggedInUser(response.data.user)
            setIsAuthenticated(true);
            setShowLoginPage(false);
        } catch {
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
                <form onSubmit={handleSubmit} className={`${formData.isRegistered ? 'five-rows-expand-three' : 'eight-rows-expand-six mt-xl'}`}>
                    <label>
                        {error && <p className="error">{error}</p>}
                        <input type="email" id="email" name="email" placeholder='Email' value={formData.email} onChange={handleChange} required />
                    </label>
                    {
                        !formData.isRegistered && (
                            <label>
                                <input type="text" id="firstName" name="firstName" placeholder='First Name' value={formData.firstName} onChange={handleChange} required />
                            </label>
                        )
                    }
                    {
                        !formData.isRegistered && (
                            <label>
                                <input type="text" id="lastName" name="lastName" placeholder='Last Name' value={formData.lastName} onChange={handleChange} required />
                            </label>
                        )
                    }
                    <label>
                        <input type="password" id="password" name="password" placeholder='Password' value={formData.password} onChange={handleChange} required />
                    </label>
                    {
                        !formData.isRegistered && (
                            <label>
                                <input type="password" id="confirmPassword" name="confirmPassword"  placeholder='Confirm Password' value={formData.confirmPassword} onChange={handleChange} required />
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
                        <button type="submit" className="login-button-styling three-rows-expand-one-three">
                            <div></div>
                            <div>{formData.isRegistered ? 'Login' : 'Register'}</div>
                            <div></div>
                        </button>
                        <div></div>
                    </div>
                </form>
                <div className='three-columns-expand-one-three'>
                    <div></div>
                    <button className="return-button-styling three-rows-expand-one-three" onClick={() => handleReturnToMainMenu()}>
                        <div></div>
                        <div>Menu</div>
                        <div></div>
                    </button>
                    <div></div>
                </div>
            </div>
        )
    );
}

export default LoginForm;
