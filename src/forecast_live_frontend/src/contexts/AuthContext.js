import React, { createContext, useContext, useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
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
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState(null); // 'nfid' or 'mock'
  const [nfidClient, setNfidClient] = useState(null);
  const [nfidError, setNfidError] = useState(null);

  // Initialize authentication when component mounts
  useEffect(() => {
    try {
      console.log('AuthContext: initializing authentication');
      initAuth();
    } catch (error) {
      console.error('AuthContext initialization error:', error);
      // Fall back to mock authentication if there's an error
      if (appConfig?.auth?.useMockAuth) {
        console.log('Falling back to mock authentication');
        setupMockAuth();
      }
    }
  }, []);

  // Check for any stored authentication from previous session
  const initAuth = async () => {
    try {
      console.log('Initializing authentication...');
      
      // Check for stored auth type from previous session
      const storedAuthType = localStorage.getItem('forecastLive_authType');
      console.log('Stored auth type:', storedAuthType);
      
      // First check if we should use mock authentication
      if (appConfig.auth.useMockAuth) {
        console.log('Using mock authentication for development');
        setupMockAuth();
        return;
      }
      
      // Try to resume session from NFID if that was the previous auth type
      if (storedAuthType === 'nfid') {
        try {
          // When implementing NFID, handle session restoration here
          console.log('NFID sessions not fully implemented yet');
          // If we can't restore NFID session in development, use mock auth
          if (process.env.NODE_ENV !== 'production') {
            setupMockAuth();
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error('Failed to restore NFID session:', error);
          setLoading(false);
        }
      } else {
        // No previous session or not using NFID
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
    }
  };
  
  // Setup for mock authentication in development mode
  const setupMockAuth = () => {
    // Create a mock principal
    const mockPrincipal = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
    
    try {
      // Create a Principal object for our mock
      const principalObj = Principal.fromText(mockPrincipal);
      
      // Create a mock identity that returns our principal
      const mockIdentity = {
        getPrincipal: () => principalObj,
        _principal: principalObj
      };
      
      // Set up the user with the mock principal
      setUser({
        principal: principalObj,
        principalText: mockPrincipal,
        name: 'Development User',
        email: 'dev@example.com',
        authType: 'mock'
      });
      
      // Store the identity for use with the ActorConfig
      setIdentity(mockIdentity);
      setIsAuthenticated(true);
      setAuthType('mock');
      setLoading(false);
      
      // Store auth type in localStorage for persistence
      localStorage.setItem('forecastLive_authType', 'mock');
      console.log('Mock authentication setup complete with identity:', mockIdentity);
    } catch (error) {
      console.error('Error setting up mock auth:', error);
      // Fallback to simpler mock if Principal creation fails
      const simpleObj = {
        toText: () => mockPrincipal,
        toString: () => mockPrincipal
      };
      
      const simpleIdentity = {
        getPrincipal: () => simpleObj
      };
      
      setUser({
        principal: simpleObj,
        principalText: mockPrincipal,
        name: 'Development User',
        email: 'dev@example.com',
        authType: 'mock'
      });
      
      setIdentity(simpleIdentity);
      setIsAuthenticated(true);
      setAuthType('mock');
      setLoading(false);
      localStorage.setItem('forecastLive_authType', 'mock');
    }
  };

  // Attempt to login with NFID
  const loginWithNFID = async () => {
    try {
      setLoading(true);
      setNfidError(null);
      
      if (appConfig.auth.useMockAuth) {
        console.log('Using mock auth instead of NFID due to config');
        return loginWithMock();
      }
      
      // In a real implementation, we would:
      // 1. Import the NFID client
      // 2. Configure it with our app settings
      // 3. Handle the login flow
      // 4. Store the identity and principal
      
      console.log('NFID authentication not fully implemented');
      console.log('Using mock authentication instead');
      
      // For now, we use mock authentication in development
      if (process.env.NODE_ENV !== 'production') {
        loginWithMock();
      } else {
        setLoading(false);
        setNfidError('NFID authentication is not fully implemented yet.');
      }
    } catch (error) {
      console.error('NFID Login error:', error);
      setNfidError(error.message || 'Unknown error during NFID authentication');
      setLoading(false);
    }
  };
  
  // Mock authentication for development
  const loginWithMock = async () => {
    setLoading(true);
    // Simulate a network delay
    setTimeout(() => {
      setupMockAuth();
    }, 800);
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
      setIdentity(null);
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
    identity,
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
