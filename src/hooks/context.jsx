import React, { createContext, useContext, useEffect, useState } from "react"
import { clientApi } from "../api/clientApi";

export const AppContext = createContext({
    loggedInUser: {},
    setLoggedInUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    gameDate: '',
    setGameDate: () => {}
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ gameDate, setGameDate ] = useState('')
    const [ modalToDisplay, setModalToDisplay ] = useState('');

    const getLoggedInUser = async () => {
        try {
            const response = await clientApi.getUser()
            setLoggedInUser(response.data)
            setIsAuthenticated(true)
        } catch {
            setIsAuthenticated(false)
        }
    }

    useEffect(
        () => {
            const jwtToken = localStorage.getItem("tgJwtToken")
            if (!loggedInUser?._id && jwtToken) {
                getLoggedInUser()
            }
        }, 
        [loggedInUser?._id]
    );


    const value = {
        loggedInUser,
        setLoggedInUser,
        isAuthenticated,
        setIsAuthenticated,
        gameDate,
        setGameDate,
        modalToDisplay,
        setModalToDisplay,
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

