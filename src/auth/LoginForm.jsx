import { useState, useContext } from 'react';
import '../styles/landingPage.css';
import { clientApi } from '../api/clientApi';
import { AppContext } from '../hooks/context';
import { lambda } from '../api/lambda';

function LoginForm({ setShowLoginPage, setShowLandingPageContent, hideHeaders, setHideHeaders, needsToRegister }) {    

    const { isAuthenticated, setIsAuthenticated, setLoggedInUser, isLocal } = useContext(AppContext);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        isRegistered: needsToRegister.current ? false : true,
        firstName: '',
        lastName: '',
        gender: 'PREFER_NOT_TO_SAY',
        ageRange: 'PREFER_NOT_TO_SAY',
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
            const response = isLocal ? await clientApi.login(formData.email, formData.password) : await lambda.login(formData.email, formData.password)
            localStorage.setItem("tgJwtToken", response.jwtToken);
            setLoggedInUser(response.user)
            setIsAuthenticated(true);
            setShowLoginPage(false);                
        } catch {
            setError('Error signing in. Please check your email and password.'); 
        }
    };


    async function registerUser() {
        try {
            const response = isLocal ?
                await clientApi.register( formData.email, formData.firstName, formData.lastName, formData.gender, formData.ageRange, formData.password) : 
                await lambda.register( formData.email, formData.firstName, formData.lastName, formData.gender, formData.ageRange, formData.password);
            localStorage.setItem("tgJwtToken", response.token);
            setLoggedInUser(response.user)
            setIsAuthenticated(true);
            setShowLoginPage(false);
        } catch {
            setError('Error registering user. Please check your information.'); 
        }
    }

    const handleReturnToMainMenu = () => {
        needsToRegister.current = false;
        setHideHeaders(false);
        setShowLoginPage(false)
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
                        !formData.isRegistered && ( <>
                            <label>
                                <input type="text" id="firstName" name="firstName" placeholder='First Name' value={formData.firstName} onChange={handleChange} required />
                            </label>
                            <label>
                                <input type="text" id="lastName" name="lastName" placeholder='Last Name' value={formData.lastName} onChange={handleChange} required />
                            </label>
                            <label>
                                <select name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="PREFER_NOT_TO_SAY">Gender</option>
                                </select>
                            </label>
                            <label>
                                <select name="ageRange" value={formData.ageRange} onChange={handleChange}>
                                    <option value="UNDER_14">Under 14</option>
                                    <option value="BETWEEN_15_24">Between 15-24</option>
                                    <option value="BETWEEN_25_34">Between 25-34</option>
                                    <option value="BETWEEN_35_44">Between 35-44</option>
                                    <option value="BETWEEN_45_54">Between 45-54</option>
                                    <option value="BETWEEN_55_64">Between 55-64</option>
                                    <option value="BETWEEN_65_74">Between 65-74</option>
                                    <option value="OVER_74">Over 75</option>
                                    <option value="PREFER_NOT_TO_SAY">Age</option>
                                </select>
                            </label>
                        </>
                        )
                    }
                    <label>
                        <input type="password" id="password" name="password" placeholder='Password' value={formData.password} onChange={handleChange} required />
                    </label>
                    {
                        !formData.isRegistered && <label>
                            <input type="password" id="confirmPassword" name="confirmPassword"  placeholder='Confirm Password' value={formData.confirmPassword} onChange={handleChange} required />
                        </label>
                    }
                    <div></div>
                    <div className="switch-container">
                        <span className="switch-text" onClick={handleIsRegisteredClick}>
                            {formData.isRegistered ? "Need to register?" : "Already registered?"}
                        </span>
                    </div>
                    <div className='three-columns-expand-one-three mt-s'>
                        <div></div>
                        <button type="submit" className="login-button-styling three-rows-expand-one-three">
                            <div></div>
                            <div>{formData.isRegistered ? 'Login' : 'Register'}</div>
                            <div></div>
                        </button>
                        <div></div>
                    </div>
                </form>
                <div className='three-columns-expand-one-three mt-s'>
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
