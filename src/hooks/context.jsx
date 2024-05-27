/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from "react"
import { clientApi } from "../api/clientApi";
import { lambda } from "../api/lambda";

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
    isLocal: false,
    fetchingLoggedInUser: false,
    setFetchingLoggedInUser: () => {}
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState({});
    const [ breakdown, setBreakdown ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ modalToDisplay, setModalToDisplay ] = useState('');
    const isLocal = window.location.hostname.includes('localhost');
    const [ isMuted, setIsMuted ] = useState(false);
    const [ selectedGameMode, setSelectedGameMode ] = useState('groceries')
    const [ fetchingLoggedInUser, setFetchingLoggedInUser ] = useState(false)
    const [audio] = useState(new Audio("/Sounds/click.wav"));

    const handleSignOut = () => {
        if(!isMuted) audio.play();
        localStorage.removeItem("tgJwtToken")
        setIsAuthenticated(false)
        setLoggedInUser({});
    }

    const getLoggedInUser = async () => {
        setFetchingLoggedInUser(true)
        try {
            const res = isLocal ? await clientApi.getUser() : await lambda.getUser()
            setLoggedInUser(res)
            setIsAuthenticated(true)
        } catch {
            localStorage.removeItem("tgJwtToken")
            setIsAuthenticated(false)
        } finally {
            setFetchingLoggedInUser(false)
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
            if(!isMuted && modalToDisplay) audio.play()
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
        setSelectedGameMode,
        isLocal,
        fetchingLoggedInUser,
        setFetchingLoggedInUser
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

