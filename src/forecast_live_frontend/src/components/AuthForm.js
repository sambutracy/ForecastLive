import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthForm() {
  const { loginWithNFID, loginWithII, loading, authError } = useAuth();
  const [localError, setLocalError] = useState(null);

  // Handle login with error catching
  const handleLogin = async (method) => {
    try {
      setLocalError(null);
      console.log(`Attempting to login with method: ${method.name || 'unknown'}`);
      
      const success = await method();
      if (!success) {
        setLocalError('Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLocalError(error.message || 'Authentication failed. Please try again.');
    }
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
          
          {(localError || authError) && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-md mb-4">
              <p className="font-medium mb-2">{localError || authError}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* NFID Option - Make this primary */}
            <button
              onClick={() => handleLogin(loginWithNFID)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 text-lg font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center justify-center">
                <img 
                  src="https://nfid.one/icons/nfid-logo.svg" 
                  alt="NFID" 
                  className="w-5 h-5 mr-2" 
                />
                <span>{loading ? 'Connecting...' : 'Login with NFID'}</span>
              </div>
            </button>
            
            {/* Internet Identity */}
            <button
              onClick={() => handleLogin(loginWithII)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 text-lg font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2">
                  <path d="M20.5 41C31.8218 41 41 31.8218 41 20.5C41 9.17816 31.8218 0 20.5 0C9.17816 0 0 9.17816 0 20.5C0 31.8218 9.17816 41 20.5 41Z" fill="white"/>
                  <path d="M35 20.5C35 28.5081 28.5081 35 20.5 35C12.4919 35 6 28.5081 6 20.5C6 12.4919 12.4919 6 20.5 6C28.5081 6 35 12.4919 35 20.5Z" fill="#3B00B9"/>
                  <path d="M29 20.5C29 25.1944 25.1944 29 20.5 29C15.8056 29 12 25.1944 12 20.5C12 15.8056 15.8056 12 20.5 12C25.1944 12 29 15.8056 29 20.5Z" fill="white"/>
                </svg>
                <span>{loading ? 'Connecting...' : 'Login with Internet Identity'}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;
