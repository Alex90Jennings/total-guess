/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from "react"
import { clientApi } from "../api/clientApi";

export const AppContext = createContext({
    loggedInUser: {},
    setLoggedInUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    handleSignOut: () => {},
    isMuted: false,
    setIsMuted: () => {},
    breakdown: {},
    setBreakdown: () => {},
    selectedGameMode: '',
    setSelectedGameMode: () => {},
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ breakdown, setBreakdown ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ modalToDisplay, setModalToDisplay ] = useState('');
    const [ isMuted, setIsMuted ] = useState(false);
    const [ selectedGameMode, setSelectedGameMode ] = useState('groceries')
    const [audio] = useState(new Audio("/Sounds/click.wav"));

    const handleSignOut = () => {
        if(!isMuted) audio.play();
        localStorage.setItem("tgJwtToken", "")
        setIsAuthenticated(false)
        setLoggedInUser({});
    }

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

    useEffect(
        () => {
            if(!isMuted) audio.play()
        }, 
        [modalToDisplay]
    );

    const value = {
        loggedInUser,
        setLoggedInUser,
        isAuthenticated,
        setIsAuthenticated,
        modalToDisplay,
        setModalToDisplay,
        handleSignOut,
        isMuted,
        setIsMuted,
        breakdown,
        setBreakdown,
        selectedGameMode,
        setSelectedGameMode
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

