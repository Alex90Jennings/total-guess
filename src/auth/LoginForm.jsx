/* eslint-disable react-hooks/exhaustive-deps */
import { useContext } from 'react';
import '../styles/landingPage.css';
import { AppContext } from '../hooks/context';
import { login, register } from '../api/auth';
import { getStats } from '../api/stats';

function LoginForm({ setElementToDisplay, setFormData, formData, setIsLoading, setError, error }) {

    const { isAuthenticated, setIsAuthenticated, setLoggedInUser, setStats } = useContext(AppContext);

    const handleChange = (event) => {
        setError(null)
        const { name, value } = event.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setError(null)
        formData.isRegistered ? signInUser() : registerUser();
    };

    /** Sign in, then load the player's saved stats. */
    const applyUser = async (user) => {
        setLoggedInUser(user)
        setIsAuthenticated(true)
        try {
            setStats(await getStats(user.$id));
        } catch {
            // Stats are a nice-to-have; a failure here should not block sign in.
        }
    };

    const signInUser = async () => {
        setIsLoading(true)
        try {
            await applyUser(await login(formData.email, formData.password));
        } catch {
            setError('Error signing in. Please check your email and password.');
        } finally {
            setIsLoading(false)
        }
    };

    async function registerUser() {
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setIsLoading(true)
        try {
            // getStats carries any guest games played on this device across to the account.
            await applyUser(await register(formData.email, formData.password, formData.firstName, formData.lastName));
            setFormData({ ...formData, isRegistered: true })
            setElementToDisplay('landingPageMenu')
        } catch (registerError) {
            setError(registerError?.message || 'Error registering. Please check your information.');
        } finally {
            setIsLoading(false)
        }
    }

    const handleReturnToMainMenu = () => {
        setError(null)
        setFormData({ ...formData, isRegistered: true })
        setElementToDisplay('landingPageMenu')
    }

    const handleIsRegisteredClick = () => {
        setError(null)
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
                        </>
                        )
                    }
                    <label>
                        <input type="password" id="password" name="password" placeholder='Password' value={formData.password} onChange={handleChange} minLength={8} required />
                    </label>
                    {
                        !formData.isRegistered && <label>
                            <input type="password" id="confirmPassword" name="confirmPassword"  placeholder='Confirm Password' value={formData.confirmPassword} onChange={handleChange} minLength={8} required />
                        </label>
                    }
                    <div/>
                    <div className="switch-container">
                        <span className="switch-text" onClick={handleIsRegisteredClick}>
                            {formData.isRegistered ? "Need to register?" : "Already registered?"}
                        </span>
                    </div>
                    <div className='three-columns-expand-one-three mt-s'>
                        <div/>
                        <button type="submit" className="login-button-styling three-rows-expand-one-three">
                            <div/>
                            <div>{formData.isRegistered ? 'Login' : 'Register'}</div>
                            <div/>
                        </button>
                        <div/>
                    </div>
                </form>
                <div className='three-columns-expand-one-three mt-s'>
                    <div/>
                    <button className="return-button-styling three-rows-expand-one-three" onClick={() => handleReturnToMainMenu()}>
                        <div/>
                        <div>Menu</div>
                        <div/>
                    </button>
                    <div/>
                </div>
            </div>
        )
    );
}

export default LoginForm;
