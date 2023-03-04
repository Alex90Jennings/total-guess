import React, { useState } from 'react';
import '../styles/landingPage.css'

function LoginForm({ setIsAuthenticated, setShowLoginPage }) {
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

    const signInUser = () => {
        const jwtToken = formData.password
        console.log(formData.email, formData.password);
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('jwtToken', jwtToken);
        setIsAuthenticated(true);
        setShowLoginPage(false);
    }

    const registerUser = () => {
        const jwtToken = formData.password
        console.log(formData.email, formData.firstName, formData.lastName, formData.password, formData.confirmPassword);
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('jwtToken', jwtToken);
        setIsAuthenticated(true);
        setShowLoginPage(false);
    }

    return (
        <div className='form'>
            <form onSubmit={handleSubmit}>
                <label>
                    <div className='three-columns-expand-one-three'>
                        <div></div>
                        <span className="label-container bold">Email:</span>
                        <div></div>
                    </div>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                </label>
                {
                    !formData.isRegistered && (
                        <>
                            <label>
                                <div className='three-columns-expand-one-three'>
                                    <div></div>
                                    <span className="label-container bold">First Name:</span>
                                    <div></div>
                                </div>
                                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            </label>
                            <label>
                                <div className='three-columns-expand-one-three'>
                                    <div></div>
                                    <span className="label-container bold">Last Name:</span>
                                    <div></div>
                                </div>
                                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </label>
                        </>
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
                <div className="switch-container">
                    <span className="switch-text" onClick={() => setFormData({ ...formData, isRegistered: !formData.isRegistered })}>
                        {formData.isRegistered ? "Need to register?" : "Already registered?"}
                    </span>
                </div>
                <div className='three-columns-expand-one-three mt-m'>
                    <div></div>
                    <button type="submit" className="play-btn">{formData.isRegistered ? 'Login' : 'Register'}</button>
                    <div></div>
                </div>
            </form>
            <div className='three-columns-expand-one-three mt-m'>
                    <div></div>
                    <button className="other-btn" onClick={() => setShowLoginPage(false)}>Return to menu</button>
                    <div></div>
            </div>
        </div>
    );
}

export default LoginForm;
