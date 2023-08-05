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
    const route = '/games/gameOfTheDay'
    return await client.get(route)
}

const submitResult = async (email, date, result) => {
    const reqBody = {email, date, result}
    const route = `/user/submitResult`
    return await client.post(route, reqBody)
}

const getUser = async () => {
    const route = '/user'
    return await client.get(route)
}

const updateItemsGuess = async (itemsGuessArray) => {
    const route = `/item/submitResult`
    await client.post(route, itemsGuessArray)
}

export const clientApi = {
    login,
    register,
    fetchTodayGame,
    submitResult,
    getUser,
    updateItemsGuess
}