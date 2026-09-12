/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState } from "react"
import { getCurrentUser, logout } from "../api/auth";
import { getLocalStats, getStats } from "../api/stats";

export const AppContext = createContext({
    loggedInUser: null,
    setLoggedInUser: () => {},
    stats: { gamesPlayed: [], scores: [], badges: [] },
    setStats: () => {},
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    handleSignOut: () => {},
    breakdown: {},
    setBreakdown: () => {},
    selectedGameMode: '',
    setSelectedGameMode: () => {},
    fetchingLoggedInUser: false,
    setFetchingLoggedInUser: () => {}
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const [ loggedInUser, setLoggedInUser ] = useState(null);
    const [ stats, setStats ] = useState(getLocalStats());
    const [ breakdown, setBreakdown ] = useState({});
    const [ isAuthenticated, setIsAuthenticated ] = useState(false);
    const [ modalToDisplay, setModalToDisplay ] = useState('');
    const [ selectedGameMode, setSelectedGameMode ] = useState('groceries')
    const [ fetchingLoggedInUser, setFetchingLoggedInUser ] = useState(true)

    const handleSignOut = async () => {
        await logout();
        setIsAuthenticated(false)
        setLoggedInUser(null);
        setStats(getLocalStats());
    }

    // On load: ask Appwrite who is signed in, then load their stats. A guest
    // keeps the stats already in localStorage.
    useEffect(
        () => {
            let cancelled = false;
            const restoreSession = async () => {
                const user = await getCurrentUser();
                if (cancelled) return;
                if (user) {
                    setLoggedInUser(user);
                    setIsAuthenticated(true);
                    try {
                        const saved = await getStats(user.$id);
                        if (!cancelled) setStats(saved);
                    } catch {
                        if (!cancelled) setStats(getLocalStats());
                    }
                }
                if (!cancelled) setFetchingLoggedInUser(false);
            };
            restoreSession();
            return () => { cancelled = true; };
        },
        []
    );

    const value = {
        loggedInUser,
        setLoggedInUser,
        stats,
        setStats,
        isAuthenticated,
        setIsAuthenticated,
        modalToDisplay,
        setModalToDisplay,
        handleSignOut,
        breakdown,
        setBreakdown,
        selectedGameMode,
        setSelectedGameMode,
        fetchingLoggedInUser,
        setFetchingLoggedInUser
    };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
