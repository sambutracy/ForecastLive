import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import appConfig from '../config/appConfig';
import { AuthContextType, AuthType, UserData } from '../types/auth.types';

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [identity, setIdentity] = useState<Identity | Principal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const DEVELOPMENT_PRINCIPAL = '2vxsx-fae';
  const isDevelopment = (typeof window !== 'undefined') && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    process.env.NODE_ENV !== 'production'
  );

  // Initialize authentication when component mounts
  useEffect(() => {
    initAuth();
  }, []);

  // Check for any stored authentication from previous session
  const initAuth = async (): Promise<void> => {
    try {
      console.log('Initializing authentication...');
      setLoading(true);
      
      // Check stored auth type from previous session
      const storedAuthType = localStorage.getItem('forecastLive_authType') as AuthType;
      
      if (storedAuthType) {
        // For all auth types, check with AuthClient
        const authClient = await AuthClient.create();
        const isAuthenticated = await authClient.isAuthenticated();
        
        if (isAuthenticated) {
          const userIdentity = authClient.getIdentity();
          const principal = userIdentity.getPrincipal();
          const principalText = principal.toString();

          // Block development principal from authenticating in production only.
          if (principalText === DEVELOPMENT_PRINCIPAL && !isDevelopment) {
            console.warn('Detected development principal; blocking authentication.');
            try {
              await authClient.logout();
            } catch (e) {
              console.warn('Failed to logout development principal', e);
            }
            // Clear any stored auth so initAuth won't immediately retry with the same value
            localStorage.removeItem('forecastLive_authType');
            setAuthError('Development principal is not permitted. Please sign in with a real Internet Identity.');
            return;
          }
          if (principalText === DEVELOPMENT_PRINCIPAL && isDevelopment) {
            console.warn('Development principal detected but allowed in development mode.');
          }

          setIdentity(userIdentity);
          setUser({
            principal,
            principalText,
            authType: storedAuthType
          });

          setAuthType(storedAuthType);
          setIsAuthenticated(true);
          setAuthReady(true);
          // Try to enrich the user profile from the canister when it becomes available
          tryEnsureUserProfileWhenAvailable(principal, principalText, storedAuthType);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthError(error instanceof Error ? error.message : 'Unknown error during authentication');
    } finally {
      setLoading(false);
    }
  };

  // Login with Internet Identity
  const loginWithInternetIdentity = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const authClient = await AuthClient.create();
      
      // Configure II login options
      const iiConfig = {
        identityProvider: appConfig.auth.internetIdentity.providerUrl,
        maxTimeToLive: BigInt(8) * BigInt(24) * BigInt(3_600_000_000_000), // 8 days in nanoseconds
        windowOpenerFeatures: "width=500,height=600",
        onSuccess: () => {
          console.log('II auth success callback fired');
        }
      };
      
      // Start the login flow
      await authClient.login(iiConfig);

      // After successful login, validate principal before setting auth state
      const userIdentity = authClient.getIdentity();
      const principal = userIdentity.getPrincipal();
      const principalText = principal.toString();

      // Block development principal in production only. Allow it for local development so
      // the app can be tested against a local replica or dev identities.
      if (principalText === DEVELOPMENT_PRINCIPAL && !isDevelopment) {
        console.warn('Internet Identity returned development principal; blocking authentication.');
        try {
          await authClient.logout();
        } catch (e) {
          console.warn('Failed to logout development principal after II login', e);
        }
        // Ensure stored auth is cleared so initAuth doesn't immediately re-block
        localStorage.removeItem('forecastLive_authType');
        setAuthError('Development principal is not permitted. Please use a real Internet Identity.');
        return false;
      }
      if (principalText === DEVELOPMENT_PRINCIPAL && isDevelopment) {
        console.warn('Development principal returned by II and allowed in development mode.');
      }

      // Set identity and a minimal user immediately so UI can update
      setIdentity(userIdentity);
      setUser({ principal, principalText, authType: 'ii' });

      setAuthType('ii');
      setIsAuthenticated(true);
      setAuthReady(true);

      // Store auth type
      localStorage.setItem('forecastLive_authType', 'ii');

      // Attempt to enrich the user profile via canister when it becomes available
      tryEnsureUserProfileWhenAvailable(principal, principalText, 'ii');
      
      return true;
    } catch (error) {
      console.error('Internet Identity login error:', error);
      setAuthError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login with email
  const login = async (email: string, password: string): Promise<boolean> => {
  // Email/password authentication is intentionally disabled.
  setAuthError('Email login is disabled. Please use Internet Identity to sign in.');
  setLoading(false);
  return false;
  };

  // Register with email
  const register = async (email: string, password: string, username: string): Promise<boolean> => {
  // Registration via email is disabled. Use Internet Identity.
  setAuthError('Registration is disabled. Please use Internet Identity to sign in.');
  setLoading(false);
  return false;
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      if (authType === 'ii') {
        const authClient = await AuthClient.create();
        await authClient.logout();
      }
      
      // Clear auth state
      setIsAuthenticated(false);
      setUser(null);
      setIdentity(null);
      setAuthType(null);
      setAuthError(null);
      
      // Clear stored authentication data
      localStorage.removeItem('forecastLive_authType');
      localStorage.removeItem('forecastLive_email');
      
    } catch (error) {
      console.error('Logout error:', error);
      setAuthError(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // For compatibility with NFID (can be implemented later if needed)
  const loginWithNFID = async (): Promise<boolean> => {
    setAuthError('NFID login not implemented yet');
    return false;
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    identity,
    loading,
    authType,
  authReady,
    login,
    register,
    loginWithNFID,
    loginWithInternetIdentity,
    logout,
    authError
  };

  // Poll for usersActor availability and call ensureUserProfile to enrich user data
  async function tryEnsureUserProfileWhenAvailable(principal: any, principalText: string, authType: AuthType) {
    const start = Date.now();
    const timeout = 8_000; // 8 seconds

    const attempt = async () => {
      try {
        const usersActor = (window as any).canisterContext?.usersActor || (window as any).canisterContext?.backendActor;
        if (usersActor && usersActor.ensureUserProfile) {
          const res = await usersActor.ensureUserProfile(null, null, authType);
          if (res?.ok) {
            const profile = res.ok;
            setUser((prev) => ({
              principal,
              principalText,
              authType,
              displayName: profile.displayName,
              groupsCreated: profile.groupsCreated,
              groupsJoined: profile.groupsJoined
            }));
          }
          return;
        }
      } catch (err) {
        console.warn('ensureUserProfile attempt failed:', err);
      }

      if (Date.now() - start < timeout) {
        setTimeout(attempt, 500);
      } else {
        // Give up after timeout
        return;
      }
    };

    attempt();
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Add this global interface declaration to make TypeScript recognize the canisterContext property
declare global {
  interface Window {
    canisterContext?: {
      authActor: any;
      [key: string]: any;
    };
  }
}
