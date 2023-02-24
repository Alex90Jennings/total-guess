import './App.css';
import LoginPage from './auth/LoginPage.jsx'
import MainGamePage from './game/MainGamePage.jsx'
import { useState } from 'react';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    return (
        <div>
            {isAuthenticated ? (
                <MainGamePage />
            ) : (
                <LoginPage setIsAuthenticated={setIsAuthenticated} />
            )}
        </div>
    );
}

export default App;
