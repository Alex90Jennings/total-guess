const login = async (email, password) => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA_AUTH, {
            method: 'POST',
            'Content-Type': 'application/json',
            body: JSON.stringify({email, password})
        });

        if (!response.ok) {
            throw new Error('Failed to login user');
        }

        const responseData = await response.json();
        const { user, token } = responseData;
        return { user, token };
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

const register = async (email, firstName, lastName, gender, ageRange, password, gamesArray, scores) => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA_AUTH, {
            method: 'POST',
            'Content-Type': 'application/json',
            body: JSON.stringify({email, firstName, lastName, gender, ageRange, password, gamesArray, scores})
        });
        if (!response.ok) {
            throw new Error('Failed to register user');
        }
        const responseData = await response.json();
        const { user, token } = responseData;
        return { user, token };
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

const getUser = async () => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA + '/get-user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('tgJwtToken')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};

const getGameOfTheDay = async (gameMode) => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA + '/get-grocery-game', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('tgJwtToken')}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        } 
        return await response.json();
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};

const submitResult = async (email, date, result, gameMode, guesses) => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA + '/submit-tg-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('tgJwtToken')}`
            },
            body: JSON.stringify({email, date, result, gameMode, guesses})
        });
        if (!response.ok) {
            throw new Error('Failed to login user');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

export const lambda = {
    login,
    register,
    getUser,
    getGameOfTheDay,
    submitResult
}