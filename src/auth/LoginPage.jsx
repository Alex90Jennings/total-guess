import React from 'react';

function LoginPage({ setIsAuthenticated }) {
    const handleLogin = () => {
        setIsAuthenticated(true)
    }

    return (
        <div>
            <h1>Login Page</h1>
            <button onClick={handleLogin}>Login</button>
        </div>
    );
}

export default LoginPage;