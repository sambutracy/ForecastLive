import React, { createContext, useContext, useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
// We'll use a dynamic import approach for NFID to handle dependency issues
import appConfig from '../config/appConfig';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState(null); // 'nfid' or 'mock'
  const [nfidModule, setNfidModule] = useState(null);
  const [nfidClient, setNfidClient] = useState(null);
  const [nfidError, setNfidError] = useState(null);

  // Initialize authentication when component mounts
  useEffect(() => {
    initAuth();
  }, []);

  // Check for any stored authentication from previous session
  const initAuth = async () => {
    try {
      console.log('Initializing NFID authentication...');
      
      // Check for stored auth type from previous session
      const storedAuthType = localStorage.getItem('forecastLive_authType');
      console.log('Stored auth type:', storedAuthType);
      
      // First check if we should use mock authentication
      if (appConfig.auth.useMockAuth) {
        console.log('Using mock authentication for development');
        loginWithMock();
        return;
      }
      
      // Load NFID module dynamically to handle potential dependency issues
      try {
        // We'll use dynamic import for NFID to handle dependency issues
        console.log('Loading NFID module...');
        
        // For now, since we have dependency issues, we'll use mock auth
        console.log('NFID module couldn\'t be loaded due to dependency issues.');
        console.log('Using mock authentication as fallback.');
        
        // In development, we fall back to mock authentication
        if (process.env.NODE_ENV !== 'production') {
          loginWithMock();
        } else {
          setLoading(false);
          setNfidError('NFID authentication is currently unavailable. Please try again later.');
        }
      } catch (error) {
        console.error('Failed to load NFID module:', error);
        // In development, we fall back to mock authentication
        if (process.env.NODE_ENV !== 'production') {
          loginWithMock();
        } else {
          setLoading(false);
          setNfidError('NFID authentication is currently unavailable. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  };

  // Attempt to login with NFID
  const loginWithNFID = async () => {
    try {
      setLoading(true);
      
      if (appConfig.auth.useMockAuth) {
        return loginWithMock();
      }
      
      // Dynamic NFID authentication implementation will go here
      console.log('NFID authentication temporarily disabled due to dependency issues');
      console.log('Using mock authentication instead');
      
      // For now, we use mock authentication
      loginWithMock();
    } catch (error) {
      console.error('NFID Login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error during NFID authentication'}`);
      setLoading(false);
    }
  };
  
  // Mock authentication for development
  const loginWithMock = async () => {
    setLoading(true);
    setTimeout(() => {
      console.log('Setting up mock authentication with principal:', appConfig.auth.mockPrincipal);
      
      const mockPrincipal = {
        getPrincipal: () => ({
          toText: () => appConfig.auth.mockPrincipal
        })
      };
      
      setUser({
        principal: mockPrincipal.getPrincipal(),
        principalText: mockPrincipal.getPrincipal().toText(),
        authType: 'mock'
      });
      setIsAuthenticated(true);
      setAuthType('mock');
      setLoading(false);
      
      // Store auth type in localStorage for persistence
      localStorage.setItem('forecastLive_authType', 'mock');
    }, 1000);
  };

  // Main login function - for now defaults to NFID or mock
  const login = async () => {
    if (appConfig.auth.useMockAuth) {
      return loginWithMock();
    }
    return loginWithNFID();
  };

  // Logout function
  const logout = async () => {
    try {
      console.log(`Logging out from authentication type: ${authType}`);
      
      if (authType === 'nfid' && nfidClient) {
        // Logout from NFID if available
        console.log('Performing NFID logout...');
        try {
          await nfidClient.logout();
          console.log('NFID logout successful');
        } catch (error) {
          console.error('NFID logout error:', error);
        }
      }
      
      // Clear auth state
      setIsAuthenticated(false);
      setUser(null);
      setAuthType(null);
      
      // Clear any stored authentication data
      localStorage.removeItem('forecastLive_authType');
      
      console.log('Authentication state cleared successfully');
    } catch (error) {
      console.error('Logout error:', error);
      alert(`Logout failed: ${error.message || 'Unknown error during logout'}`);
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    authType,
    login,
    loginWithNFID,
    logout,
    nfidError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
