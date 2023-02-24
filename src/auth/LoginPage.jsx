import React, { useState } from 'react';
import './loginPage.css'

function LoginPage({ setIsAuthenticated }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistered, setIsRegistered] = useState(true);

    const handleEmailChange = (event) => {
        setEmail(event.target.value);
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const handleSwitch = () => {
        setIsRegistered(!isRegistered);
    };

    const handleLogin = (event) => {
        event.preventDefault();
        // IN FUTURE THIS WILL BE THE API CALL FOR THE JWT TOKEN
        const jwtToken = password
        console.log(email, password);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('jwtToken', jwtToken);
        setIsAuthenticated(true);
    };

    return (
        <div className='form-container'>
            <form className='form' onSubmit={handleLogin}>
                <h1 className="title">CANTAB</h1>
                <label className='login-inputs'>
                    <div className="label-container">
                        <span className='bold'>Email:</span>
                    </div>
                    <div className="input-container">
                        <input type="email" value={email} onChange={handleEmailChange} required />
                    </div>
                </label>
                {!isRegistered && (
                    <>
                        <label className='login-inputs'>
                            <div className="label-container">
                                <span className='bold'>First Name:</span>
                            </div>
                            <div className="input-container">
                                <input type="text" required />
                            </div>
                        </label>
                        <label className='login-inputs'>
                            <div className="label-container">
                                <span className='bold'>Last Name:</span>
                            </div>
                            <div className="input-container">
                                <input type="text" required />
                            </div>
                        </label>
                    </>
                )}
                <label className='login-inputs'>
                    <div className="label-container">
                        <span className='bold'>Password:</span>
                    </div>
                    <div className="input-container">
                        <input type="password" value={password} onChange={handlePasswordChange} required />
                    </div>
                </label>
                {!isRegistered && (
                    <>
                        <label className='login-inputs'>
                            <div className="label-container">
                                <span className='bold'>Confirm Password:</span>
                            </div>
                            <div className="input-container">
                                <input type="password" required />
                            </div>
                        </label>
                    </>
                )}
                <div className="switch-container">
                    <span className="switch-text" onClick={handleSwitch}>
                        {isRegistered ? "Need to register?" : "Already registered?"}
                    </span>
                </div>
                <button type="submit" className="btn">{isRegistered ? 'Login' : 'Register'}</button>
            </form>
        </div>
    );
}

export default LoginPage;
