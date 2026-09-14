/* eslint-disable react-hooks/exhaustive-deps */
import { useContext } from 'react';
import '../styles/landingPage.css';
import '../styles/screens.css';
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

    const isLogin = formData.isRegistered;

    return (
        !isAuthenticated && (
            <div className="screen__inner screen__inner--narrow auth">
                <button type="button" className="screen-back" onClick={handleReturnToMainMenu}>← Menu</button>

                <p className="screen__eyebrow">{isLogin ? 'Sign in' : 'Create an account'}</p>
                <h1 className="screen__title">{isLogin ? 'Welcome back' : 'Keep your streak'}</h1>
                <p className="screen__lede">
                    {isLogin
                        ? 'Sign in to play today’s basket and keep your stats.'
                        : 'Save your scores, earn badges and see how your guessing improves.'}
                </p>

                <form onSubmit={handleSubmit} className="auth-form" noValidate={false}>
                    {error && <p className="auth-error" role="alert">{error}</p>}

                    {!isLogin && (
                        <div className="auth-row">
                            <label className="auth-field">
                                <span>First name</span>
                                <input type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} required />
                            </label>
                            <label className="auth-field">
                                <span>Last name</span>
                                <input type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} required />
                            </label>
                        </div>
                    )}

                    <label className="auth-field">
                        <span>Email</span>
                        <input type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} required />
                    </label>

                    <label className="auth-field">
                        <span>Password</span>
                        <input type="password" name="password" autoComplete={isLogin ? 'current-password' : 'new-password'} value={formData.password} onChange={handleChange} minLength={8} required />
                    </label>

                    {!isLogin && (
                        <label className="auth-field">
                            <span>Confirm password</span>
                            <input type="password" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} minLength={8} required />
                        </label>
                    )}

                    <button type="submit" className="screen-button screen-button--primary">
                        {isLogin ? 'Sign in' : 'Create account'}
                    </button>
                </form>

                <p className="auth-switch">
                    {isLogin ? 'New to Total Guess?' : 'Already have an account?'}{' '}
                    <button type="button" className="screen-link" onClick={handleIsRegisteredClick}>
                        {isLogin ? 'Create an account' : 'Sign in'}
                    </button>
                </p>
            </div>
        )
    );
}

export default LoginForm;
