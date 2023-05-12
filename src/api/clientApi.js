import { authClient } from "./authClient";
import { client } from "./client";

const login = async (email, password) => {
    const route = '/auth/login'
    return await authClient.post(route, { email, password })
}

const register = async (email, firstName, lastName, password) => {
    const route = '/auth/register'
    return await authClient.post(route, { email, firstName, lastName, password })
}

const fetchTodayGame = async () => {
    const route = '/game'
    return await client.get(route)
}

export const clientApi = {
    login,
    register,
    fetchTodayGame
}