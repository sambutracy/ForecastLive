import React, { createContext, useContext, useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import appConfig from '../config/appConfig';
import ENV from '../config/env';

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
  const [authType, setAuthType] = useState(null); // 'nfid' or 'ii'
  const [authError, setAuthError] = useState(null);

  // Initialize authentication when component mounts
  useEffect(() => {
    initAuth();
  }, []);

  // Check for any stored authentication from previous session
  const initAuth = async () => {
    try {
      console.log('Initializing authentication...');
      setLoading(true);
      
      // Check for stored auth type from previous session
      const storedAuthType = localStorage.getItem('forecastLive_authType');
      console.log('Stored auth type:', storedAuthType);
      
      // Check if we have a stored NFID session
      if (storedAuthType === 'nfid') {
        await checkNfidSession();
      }
      
      // For Internet Identity auth
      if (storedAuthType === 'ii') {
        await checkInternetIdentitySession();
      }
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check existing NFID session
  const checkNfidSession = async () => {
    try {
      // Dynamic import to handle potential module loading issues
      const { NFID } = await import('@nfid/embed');
      
      // Check if user is already authenticated
      const isAuthenticated = await NFID.isAuthenticated();
      
      if (isAuthenticated) {
        console.log('User is already authenticated with NFID');
        const identity = await NFID.getIdentity();
        const principal = identity.getPrincipal();
        const principalText = principal.toString();
        
        console.log('NFID User principal:', principalText);
        
        setIdentity(identity);
        setUser({
          principal,
          principalText,
          authType: 'nfid'
        });
        
        setAuthType('nfid');
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('NFID session check failed:', error);
      setAuthError('Failed to check NFID session');
    }
  };

  // Check existing Internet Identity session
  const checkInternetIdentitySession = async () => {
    try {
      console.log('Checking Internet Identity session');
      const authClient = await AuthClient.create();
      
      // Check if already authenticated
      const isAuthenticated = await authClient.isAuthenticated();
      
      if (isAuthenticated) {
        console.log('User is already authenticated with Internet Identity');
        const identity = authClient.getIdentity();
        const principal = identity.getPrincipal();
        const principalText = principal.toString();
        
        console.log('II User principal:', principalText);
        
        setIdentity(identity);
        setUser({
          principal,
          principalText,
          authType: 'ii'
        });
        
        setAuthType('ii');
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Internet Identity session check failed:', error);
      setAuthError('Failed to check Internet Identity session');
    }
  };

  // Login with NFID
  const loginWithNFID = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      console.log('Starting NFID authentication flow...');
      
      // Dynamic import to handle potential module loading issues
      const { NFID } = await import('@nfid/embed');
      
      // Initialize NFID with configuration
      await NFID.init({
        application: {
          name: appConfig.auth.nfid.applicationName,
          logo: appConfig.auth.nfid.applicationLogo,
        },
        idleOptions: {
          disableIdle: true,
        },
      });
      
      console.log('NFID initialized, starting login...');
      
      // Start the NFID login flow
      const identity = await NFID.authenticate({
        derivationOrigin: appConfig.auth.nfid.derivationOrigin,
      });
      
      if (!identity) {
        throw new Error('NFID authentication failed - no identity returned');
      }
      
      console.log('NFID authentication successful');
      
      const principal = identity.getPrincipal();
      const principalText = principal.toString();
      
      console.log('NFID User principal:', principalText);
      
      // Set user and auth state
      setIdentity(identity);
      setUser({
        principal,
        principalText,
        authType: 'nfid'
      });
      
      setAuthType('nfid');
      setIsAuthenticated(true);
      
      // Store auth type
      localStorage.setItem('forecastLive_authType', 'nfid');
      
      return true;
    } catch (error) {
      console.error('NFID Login error:', error);
      setAuthError(`NFID authentication failed: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login with Internet Identity
  const loginWithII = async () => {
    try {
      console.log('Attempting Internet Identity login');
      setLoading(true);
      setAuthError(null);
      
      // Create auth client
      const authClient = await AuthClient.create();
      
      // Start the login flow
      await new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: ENV.IS_PRODUCTION
            ? 'https://identity.ic0.app'
            : `http://localhost:8000?canisterId=${ENV.INTERNET_IDENTITY_CANISTER_ID}`,
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
          windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
        });
      });
      
      // After successful login
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      const principalText = principal.toString();
      
      console.log('Internet Identity login successful, principal:', principalText);
      
      // Set user data
      setIdentity(identity);
      setUser({
        principal,
        principalText,
        authType: 'ii'
      });
      
      setAuthType('ii');
      setIsAuthenticated(true);
      
      // Store auth type
      localStorage.setItem('forecastLive_authType', 'ii');
      
      return true;
    } catch (error) {
      console.error('Internet Identity login error:', error);
      setAuthError(`Internet Identity authentication failed: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log(`Logging out from authentication type: ${authType}`);
      
      if (authType === 'ii') {
        console.log('Performing Internet Identity logout...');
        const authClient = await AuthClient.create();
        await authClient.logout();
        console.log('Internet Identity logout successful');
      } else if (authType === 'nfid') {
        console.log('Performing NFID logout...');
        const { NFID } = await import('@nfid/embed');
        await NFID.logout();
        console.log('NFID logout successful');
      }
      
      // Clear auth state
      setIsAuthenticated(false);
      setUser(null);
      setIdentity(null);
      setAuthType(null);
      setAuthError(null);
      
      // Clear any stored authentication data
      localStorage.removeItem('forecastLive_authType');
      
      console.log('Authentication state cleared successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(`Logout failed: ${error.message}`);
    }
  };

  const value = {
    isAuthenticated,
    user,
    identity,
    loading,
    authType,
    loginWithNFID,
    loginWithII,
    logout,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
