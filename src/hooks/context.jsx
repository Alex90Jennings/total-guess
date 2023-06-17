import React, { createContext, useContext, useEffect, useState } from "react"

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

    useEffect(
        () => {
            const jwtToken = localStorage.getItem("tgJwtToken")
            if (!loggedInUser?._id && jwtToken) {
                console.log("hi")

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
        setGameDate
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

