/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from "react"
import { clientApi } from "../api/clientApi";

export const AppContext = createContext({
    loggedInUser: {},
    setLoggedInUser: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    gameDate: '',
    setGameDate: () => {},
    handleSignOut: () => {},
    isMuted: false,
    setIsMuted: () => {},
    breakdown: {},
    setBreakdown: () => {}
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ breakdown, setBreakdown ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ gameDate, setGameDate ] = useState('')
    const [ modalToDisplay, setModalToDisplay ] = useState('');
    const [ isMuted, setIsMuted ] = useState(false);
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
        gameDate,
        setGameDate,
        modalToDisplay,
        setModalToDisplay,
        handleSignOut,
        isMuted,
        setIsMuted,
        breakdown,
        setBreakdown
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

