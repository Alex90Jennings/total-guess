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

const register = async (email, firstName, lastName, gender, ageRange, password) => {
    try {
        const response = await fetch(process.env.REACT_APP_LAMBDA_AUTH, {
            method: 'POST',
            'Content-Type': 'application/json',
            body: JSON.stringify({email, firstName, lastName, gender, ageRange, password})
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
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};

const getGameOfTheDay = async (gameMode) => {
    console.log(process.env.REACT_APP_LAMBDA + '/get-grocery-game')
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
        const game = await response.json();
        return game;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
};

export const lambda = {
    login,
    register,
    getUser,
    getGameOfTheDay
}