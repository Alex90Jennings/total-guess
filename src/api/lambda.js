const login = async (email, password) => {
    try {
        const response = await fetch(process.env.LAMBDA_AUTH, {
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
        const response = await fetch(process.env.LAMBDA_AUTH, {
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

export const lambda = {
    login,
    register
}