import React, { createContext, useContext, useState } from "react"

export const AppContext = createContext({
    loggedInUser: {},
    setLoggedInUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    hideHeaders: false,
    setHideHeaders: () => {},
    gameDate: '',
    setGameDate: () => {}
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ hideHeaders, setHideHeaders ] = useState(false)
    const [ gameDate, setGameDate ] = useState('')

    const value = {
        loggedInUser,
        setLoggedInUser,
        isAuthenticated,
        setIsAuthenticated,
        hideHeaders,
        setHideHeaders,
        gameDate,
        setGameDate
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

