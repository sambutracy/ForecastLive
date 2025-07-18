import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import appConfig from '../config/appConfig';

function AuthForm() {
  const { login, loginWithNFID, loading, nfidError } = useAuth();
  const [authError, setAuthError] = useState(null);

  // Handle login with error catching
  const handleLogin = async (method, type = null) => {
    try {
      setAuthError(null);
      console.log(`Attempting to login with method: ${method.name || 'unknown'}, type: ${type || 'default'}`);
      
      // For development - use mock authentication if F1 service is not running
      if (!appConfig.api.f1DataService && !appConfig.auth.useMockAuth) {
        console.log('F1 data service is not running. Using mock authentication for development.');
        // Update config to use mock authentication
        appConfig.auth.useMockAuth = true;
      }
      
      if (type) {
        await method(type);
      } else {
        await method();
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error.message || 'Authentication failed. Please try again.');
    }
  };

  // Determine the login text based on config
  const getLoginButtonText = () => {
    if (loading) return 'Connecting...';
    if (appConfig.auth.useMockAuth) return 'Login (Development Mode)';
    return 'Login with NFID';
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="card text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Welcome to Forecast Live
          </h1>
          <p className="text-gray-400">
            The ultimate F1 prediction dApp on the Internet Computer
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-4">How it works:</h2>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Upload your F1 prediction screenshot</li>
              <li>• AI extracts your top 10 driver picks</li>
              <li>• Watch your score update live during races</li>
              <li>• Compete with other fans on the leaderboard</li>
            </ul>
          </div>
          
          {(authError || nfidError) && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-md mb-4">
              <p className="font-medium mb-2">{authError || nfidError}</p>
              {!appConfig.api.f1DataService && (
                <p className="text-xs text-red-300">
                  Note: F1 data service is not running. Login will use mock authentication in development mode.
                </p>
              )}
            </div>
          )}

          {appConfig.auth.useMockAuth ? (
            // Mock authentication for development
            <button
              onClick={() => handleLogin(login)}
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Login (Development Mode)'}
            </button>
          ) : (
            // NFID authentication option
            <div className="space-y-4">
              <button
                onClick={() => handleLogin(login)}
                disabled={loading}
                className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50"
              >
                <div className="flex items-center justify-center">
                  <img 
                    src="https://nfid.one/icons/nfid-logo.svg" 
                    alt="NFID" 
                    className="w-5 h-5 mr-2" 
                  />
                  <span>{getLoginButtonText()}</span>
                </div>
              </button>
              
              <p className="text-xs text-gray-400 mt-2">
                Powered by NFID - Non-Fungible Identity
              </p>
            </div>
          )}
          
          {appConfig.auth.useMockAuth && (
            <p className="text-xs text-gray-500 mt-4">
              Development mode - Authentication is mocked for testing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
