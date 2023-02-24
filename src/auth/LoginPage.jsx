import React, { useState } from 'react';
import './loginPage.css'

function LoginPage({ setIsAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
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
        <h1>CANTAB</h1>
        <label className='login-inputs'>
            <span className='bold'>Email:</span>
            <input className='inline' type="email" value={email} onChange={handleEmailChange} required />
        </label>
        <label className='login-inputs'>
            <span className='bold'>Password:</span>
            <input className='full-width' type="password" value={password} onChange={handlePasswordChange} required />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;
