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
      
      // If we're in development mode and mock auth is enabled, use mock
      if (appConfig.auth.useMockAuth) {
        console.log('Using mock authentication for development');
        setupMockAuth();
        return;
      }

      // Check if we have a stored NFID session - but wrap in try-catch
      if (storedAuthType === 'nfid') {
        try {
          console.log('Attempting to restore NFID session...');
          const nfidLoaded = await loadNFID();
          if (!nfidLoaded) {
            throw new Error('Failed to load NFID module');
          }
          
          const nfidAuth = await NFIDAuth.load();
          
          if (nfidAuth && nfidAuth.isAuthenticated()) {
            console.log('User is already authenticated with NFID');
            const identity = nfidAuth.getIdentity();
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
            setNfidClient(nfidAuth);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('NFID session restoration failed:', error);
          setNfidError(`Failed to restore NFID session: ${error.message}`);
          // Don't return here, fall through to other auth methods
        }
      }
      
      // For Internet Identity auth
      if (storedAuthType === 'ii') {
        console.log('Setting up Internet Identity authentication');
        const authClient = await AuthClient.create();
        
        // Check if already authenticated
        const isAuthenticated = await authClient.isAuthenticated();
        
        if (isAuthenticated) {
          console.log('User is already authenticated with Internet Identity');
          // Get the identity
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          const principalText = principal.toString();
          
          console.log('II User principal:', principalText);
          
          // Set the user data
          setIdentity(identity);
          setUser({
            principal,
            principalText,
            authType: 'ii'
          });
          
          setAuthType('ii');
          setIsAuthenticated(true);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Fall back to mock auth if we're in development
      if (!ENV.IS_PRODUCTION && appConfig.auth.useMockAuth) {
        console.log('Falling back to mock authentication due to error');
        setupMockAuth();
      } else {
        setLoading(false);
      }
    }
  };
  
  // Initialize NFID client
  const initNfidClient = async () => {
    try {
      // First load the NFID module if not already loaded
      if (!NFIDAuth || !NFIDConfig || !NFIDNetworkOption) {
        console.log('Loading NFID module...');
        const loaded = await loadNFID();
        if (!loaded) {
          throw new Error('Failed to load NFID module');
        }
      }

      console.log('Creating NFID config...');
      const config = new NFIDConfig({
        application: {
          name: appConfig.auth.nfid.applicationName,
          logo: appConfig.auth.nfid.applicationLogo,
        },
        networkOption: ENV.IS_PRODUCTION ? 
          NFIDNetworkOption.MAINNET : 
          NFIDNetworkOption.TESTNET,
        redirectURL: appConfig.auth.nfid.redirectUri || window.location.origin,
        derivationOrigin: appConfig.auth.nfid.derivationOrigin
      });
      
      console.log('NFID config created:', config);
      
      // Initialize NFID client with config
      await NFIDAuth.init(config);
      console.log('NFID client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NFID client:', error);
      setNfidError(`NFID initialization failed: ${error.message}`);
      return false;
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

  // Login with Internet Identity
  const loginWithII = async () => {
    try {
      console.log('Attempting Internet Identity login');
      setLoading(true);
      
      // Create auth client
      const authClient = await AuthClient.create();
      
      // Start the login flow
      await new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: 
            ENV.IS_PRODUCTION
              ? 'https://identity.ic0.app'
              : 'http://localhost:8000?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai',
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
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
    } catch (error) {
      console.error('Internet Identity login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Login with NFID
  const loginWithNFID = async () => {
    try {
      setLoading(true);
      setNfidError(null);
      
      if (appConfig.auth.useMockAuth) {
        console.log('Using mock auth instead of NFID due to config');
        return loginWithMock();
      }
      
      console.log('Initializing NFID client for login...');
      // Initialize NFID client
      const initialized = await initNfidClient();
      
      if (!initialized) {
        throw new Error('Failed to initialize NFID client');
      }
      
      console.log('Starting NFID authentication flow...');
      // Start the NFID login flow
      const nfidAuth = await NFIDAuth.login();
      
      if (!nfidAuth) {
        throw new Error('NFID authentication failed');
      }
      
      console.log('NFID authentication successful');
      // Get identity from NFID auth
      const identity = nfidAuth.getIdentity();
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
      
      setNfidClient(nfidAuth);
      setAuthType('nfid');
      setIsAuthenticated(true);
      
      // Store auth type
      localStorage.setItem('forecastLive_authType', 'nfid');
      
      return true;
    } catch (error) {
      console.error('NFID Login error:', error);
      setNfidError(error.message || 'Unknown error during NFID authentication');
      return false;
    } finally {
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

  // Main login function - selects the appropriate login method
  const login = async () => {
    if (appConfig.auth.useMockAuth) {
      return loginWithMock();
    }
    // Default to Internet Identity
    return loginWithII();
  };

  // Logout function
  const logout = async () => {
    try {
      console.log(`Logging out from authentication type: ${authType}`);
      
      if (authType === 'ii') {
        // Logout from Internet Identity
        console.log('Performing Internet Identity logout...');
        try {
          const authClient = await AuthClient.create();
          await authClient.logout();
          console.log('Internet Identity logout successful');
        } catch (error) {
          console.error('Internet Identity logout error:', error);
        }
      } else if (authType === 'nfid') {
        // Logout from NFID
        console.log('Performing NFID logout...');
        try {
          const nfidAuth = await NFIDAuth.load();
          if (nfidAuth) {
            await nfidAuth.logout();
            console.log('NFID logout successful');
          }
        } catch (error) {
          console.error('NFID logout error:', error);
        }
      }
      
      // Clear auth state
      setIsAuthenticated(false);
      setUser(null);
      setIdentity(null);
      setAuthType(null);
      setNfidClient(null);
      
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
    loginWithII,
    logout,
    nfidError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
