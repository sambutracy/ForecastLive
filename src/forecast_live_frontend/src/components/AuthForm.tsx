import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthForm(): React.ReactElement {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const { 
    loginWithNFID, 
    loginWithInternetIdentity, 
    login, 
    register,
    authError
  } = useAuth();

  const handleNFIDLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      await loginWithNFID();
    } catch (error) {
      console.error("NFID login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIILogin = async (): Promise<void> => {
    setLoading(true);
    try {
      await loginWithInternetIdentity();
    } catch (error) {
      console.error("Internet Identity login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegistering) {
        await register(email, password, username);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error("Email auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card p-8 rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Forecast Live</h1>
        <p className="text-gray-400 mt-2">F1 Prediction Platform</p>
      </div>

      <div className="space-y-6">
        {/* NFID Option (Primary) */}
        <button
          onClick={handleNFIDLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 text-lg font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-200"
        >
          <div className="flex items-center justify-center">
            <img 
              src="https://nfid.one/icons/nfid-logo.svg" 
              alt="NFID" 
              className="w-5 h-5 mr-2" 
            />
            <span>{loading ? 'Connecting...' : 'Continue with NFID'}</span>
          </div>
        </button>
        
        {/* Internet Identity */}
        <button
          onClick={handleIILogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 text-lg font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-200"
        >
          <div className="flex items-center justify-center">
            <img 
              src="https://internetcomputer.org/img/IC_logo.svg" 
              alt="Internet Identity" 
              className="w-5 h-5 mr-2" 
            />
            <span>Continue with Internet Identity</span>
          </div>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-gray-400">or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit}>
          {isRegistering && (
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your username"
                aria-label="Username"
                required
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your email"
              aria-label="Email"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your password"
              aria-label="Password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {authError && (
          <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-md text-sm">
            {authError}
          </div>
        )}
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-primary hover:underline focus:outline-none"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthForm;