import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import appConfig from '../config/appConfig';

function Header() {
  const { isAuthenticated, user, authType, logout, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get auth provider logo based on the authentication type
  const getAuthProviderLogo = () => {
    if (appConfig.auth.useMockAuth) {
      return null;
    }
    
    switch (authType) {
      case 'nfid':
        return "https://nfid.one/icons/nfid-logo.svg";
      default:
        return null;
    }
  };
  
  // Get auth provider name
  const getAuthProviderName = () => {
    if (appConfig.auth.useMockAuth) {
      return "Dev Mode";
    }
    
    switch (authType) {
      case 'nfid':
        return "NFID";
      default:
        return "";
    }
  };
  
  // Format principal for display
  const formatPrincipal = (principal) => {
    if (!principal) return '';
    const text = principal.slice(0, 5) + '...' + principal.slice(-3);
    return text;
  };
  
  // Handle logout with loading state
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-card shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-primary">
              🏎️ Forecast Live
            </div>
            <div className="text-sm text-gray-400">
              F1 Prediction dApp
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-800 rounded-full px-3 py-1" 
                  title={`Full Principal ID: ${user?.principalText}`}>
                {getAuthProviderLogo() && (
                  <img 
                    src={getAuthProviderLogo()} 
                    alt={getAuthProviderName()} 
                    className="w-4 h-4 mr-2" 
                  />
                )}
                <span className="text-xs text-gray-400 mr-1">
                  {getAuthProviderName()}:
                </span>
                <span className="text-sm font-medium text-white">
                  {formatPrincipal(user?.principalText)}
                </span>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${
                  isLoggingOut 
                    ? 'bg-gray-800 text-gray-500' 
                    : 'bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300'
                } px-3 py-1 rounded-md text-sm font-medium transition-colors`}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
          
          {loading && !isAuthenticated && (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-primary animate-spin"></div>
              <span className="text-gray-400 text-sm">Checking auth...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
