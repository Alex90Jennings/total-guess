import React, { useState } from 'react';
import './landingPage.css'

function LoginPage({ setIsAuthenticated, setShowLoginPage }) {
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
            <button onClick={() => setShowLoginPage(false)} className="btn">Return to menu</button>
            <form onSubmit={handleSubmit}>
                <label className='login-inputs'>
                    <span className="label-container bold">Email:</span>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                </label>
                {
                    !formData.isRegistered && (
                        <>
                            <label className='login-inputs' >
                                <span className="label-container bold">First Name:</span>
                                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                            </label>
                            <label className='login-inputs'>
                                <span className="label-container bold">Last Name:</span>
                                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </label>
                        </>
                    )
                }
                <label className='login-inputs'>
                    <span className="label-container bold">Password:</span>
                    <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                </label>
                {
                    !formData.isRegistered && (
                        <label className='login-inputs'>
                            <span className="label-container bold">Confirm Password:</span>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                        </label>
                    )
                }
                <div className="switch-container">
                    <span className="switch-text" onClick={() => setFormData({ ...formData, isRegistered: !formData.isRegistered })}>
                        {formData.isRegistered ? "Need to register?" : "Already registered?"}
                    </span>
                </div>
                <div>
                    <button type="submit" className="btn">{formData.isRegistered ? 'Login' : 'Register'}</button>
                </div>
            </form>
        
        </div>
    );
}

export default LoginPage;
