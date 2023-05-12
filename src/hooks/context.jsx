import React, { createContext, useContext, useState } from "react"

// TODO: make pageFound a useRef

export const AppContext = createContext({
    loggedInUser: {},
    setLoggedInUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    hideHeaders: false,
    setHideHeaders: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ hideHeaders, setHideHeaders ] = useState(false)

    const value = {
        loggedInUser,
        setLoggedInUser,
        isAuthenticated,
        setIsAuthenticated,
        hideHeaders,
        setHideHeaders
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
