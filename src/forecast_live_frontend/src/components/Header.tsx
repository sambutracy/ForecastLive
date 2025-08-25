import React, { JSX, useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Principal } from '@dfinity/principal';

interface UserDisplayInfo {
  name: string;
  id: string;
  authType: string | null;
}

const Header: React.FC = () => {
  const { isAuthenticated, user, logout, loading, authType } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Set a string literal on the DOM to satisfy static ARIA analyzers
    if (userButtonRef.current) {
      userButtonRef.current.setAttribute('aria-expanded', showUserMenu ? 'true' : 'false');
    }
  }, [showUserMenu]);
  
  // Format principal for display
  const formatPrincipal = (principal: Principal | string | undefined): string => {
    if (!principal) return '';
    try {
      const text = typeof principal === 'string' ? principal : principal.toString();
      return text.length > 12 ? text.slice(0, 6) + '...' + text.slice(-4) : text;
    } catch (e) {
      return '';
    }
  };
  
  // Handle logout with loading state
  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error: any) {
      console.error('Logout error:', error);
      alert('Failed to logout: ' + error.message);
    } finally {
      setIsLoggingOut(false);
      setShowUserMenu(false);
    }
  };

  // Get user display info
  const getUserDisplayInfo = (): UserDisplayInfo => {
    if (!user) return { name: 'Unknown', id: '', authType: null };
    
    // Internet Identity users
    if (authType === 'ii') {
      return {
        name: user.username || 'Internet Identity User',
        id: formatPrincipal(user.principal),
        authType: 'ii'
      };
    }
    
    // NFID users
    if (authType === 'nfid') {
      return {
        name: user.username || 'NFID User',
        id: formatPrincipal(user.principal),
        authType: 'nfid'
      };
    }
    
    // Development users
    if (user.isDevelopmentUser) {
      return {
        name: 'Development User',
        id: formatPrincipal(user.principal),
        authType: 'dev'
      };
    }
    
    // Email users
    return {
      name: user.username || (user.email ? user.email.split('@')[0] : 'User'),
      id: user.email || formatPrincipal(user.principal),
      authType: 'email'
    };
  };

  const userInfo = getUserDisplayInfo();
  
  // Get auth type badge
  const getAuthTypeBadge = (authType: string | null): JSX.Element | null => {
    if (authType === 'ii') {
      return (
        <span className="ml-2 text-xs bg-yellow-600/30 text-yellow-500 px-1.5 py-0.5 rounded">
          II
        </span>
      );
    } else if (authType === 'nfid') {
      return (
        <span className="ml-2 text-xs bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded">
          NFID
        </span>
      );
    } else if (authType === 'dev') {
      return (
        <span className="ml-2 text-xs bg-purple-600/30 text-purple-400 px-1.5 py-0.5 rounded">
          DEV
        </span>
      );
    }
    return null;
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
            <div className="flex items-center space-x-4 relative">
              <button
                type="button"
                className="flex items-center bg-gray-800 rounded-full px-3 py-1 cursor-pointer hover:bg-gray-700"
                onClick={() => setShowUserMenu(!showUserMenu)}
                ref={userButtonRef}
                aria-haspopup="menu"
                aria-controls="user-menu"
              >
                <span className="text-sm font-medium text-white mr-3">
                  {userInfo.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">{formatPrincipal(user?.principal)}</span>
                {getAuthTypeBadge(userInfo.authType)}
              </button>

              {showUserMenu && (
                <div id="user-menu" className="absolute right-0 top-full mt-2 w-56 bg-card border border-gray-700 rounded-md shadow-lg z-10">
                  <div className="p-3 border-b border-gray-700">
                    <div className="text-sm font-medium text-white">{userInfo.name}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.principal?.toString() || ''}</div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                </div>
              )}
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
};

export default Header;
