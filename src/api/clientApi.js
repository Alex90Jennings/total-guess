import { authClient } from "./authClient";
import { client } from "./client";

const login = async (email, password) => {
    const route = '/auth/login'
    const res = await authClient.post(route, { email, password })
    return res.data
}

const register = async (email, firstName, lastName, gender, ageRange, password) => {
    const route = '/auth/register'
    const res = await authClient.post(route, { email, firstName, lastName, gender, ageRange, password })
    return res.data
}

const fetchTodayGame = async (gameMode) => {
    const route = `/games/gameOfTheDay/${gameMode}`
    const res = await client.get(route)
    return res.data
}

const submitResult = async (email, date, result, gameMode, itemsGuessArray) => {
    const reqBody = {email, date, result, itemsGuessArray}
    const route = `/user/submitResult/${gameMode}`
    const res = await client.post(route, reqBody)
    return res.data
}

const getUser = async () => {
    const route = '/user'
    const res = await client.get(route)
    return res.data
}

export const clientApi = {
    login,
    register,
    fetchTodayGame,
    submitResult,
    getUser
}