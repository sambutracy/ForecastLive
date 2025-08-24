import React, { useState, JSX } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import PredictionUpload from './components/PredictionUpload';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import ChooseGroup from './components/ChooseGroup';
import CreateGroup from './components/CreateGroup';
import JoinGroup from './components/JoinGroup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CanisterProvider } from './contexts/CanisterContext';
import { F1LiveDataProvider } from './contexts/F1LiveDataContext';

function AppContent(): JSX.Element {
  console.log('AppContent rendering');
  
  // Access auth context directly
  const auth = useAuth();
  // Only consider the user fully authenticated when auth initialization is finished (authReady)
  // This prevents showing the dashboard when a minimal/mock identity is set before canister enrichment.
  const isAuthenticated = auth.isAuthenticated && auth.authReady;
  console.log('isAuthenticated:', isAuthenticated);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload' | 'create' | 'join'>('dashboard');
  const [showChooseFirst, setShowChooseFirst] = useState<boolean>(false);

  // Show ChooseGroup on first authenticated visit after auth initialization completes
  React.useEffect(() => {
    const seen = localStorage.getItem('forecastLive_seenChooseGroup');
    // Only show when authenticated and auth initialization is finished
    // - show if user hasn't seen the chooser yet, OR
    // - show if the authenticated user has no joined groups (so they can create/join)
    const hasGroups = Array.isArray(auth.user?.groupsJoined) && auth.user!.groupsJoined.length > 0;
    if (auth.isAuthenticated && auth.authReady && (!seen || !hasGroups)) {
      setShowChooseFirst(true);
    }
  }, [auth.isAuthenticated, auth.authReady]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {!isAuthenticated ? (
        // Show landing page with login/signup when not authenticated
        <LandingPage />
      ) : (
        // Show app content when authenticated
        <>
          <Header />
          <main className="container mx-auto px-4 py-8">
            {showChooseFirst ? (
                <ChooseGroup
                  onChooseCreate={() => {
                    localStorage.setItem('forecastLive_seenChooseGroup', '1');
                    setShowChooseFirst(false);
                    setCurrentView('create');
                  }}
                  onChooseJoin={() => {
                    localStorage.setItem('forecastLive_seenChooseGroup', '1');
                    setShowChooseFirst(false);
                    setCurrentView('join');
                  }}
                />
            ) : (
              <>
                <div className="flex justify-center mb-8">
                  <div className="bg-card rounded-lg p-2 inline-flex">
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        currentView === 'dashboard'
                          ? 'bg-primary text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView('upload')}
                      className={`px-4 py-2 rounded-md transition-colors ${
                        currentView === 'upload'
                          ? 'bg-primary text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Upload Prediction
                    </button>
                  </div>
                </div>

                {currentView === 'dashboard' && <Dashboard />}
                {currentView === 'upload' && <PredictionUpload />}
                {currentView === 'create' && (
                  <CreateGroup
                    onCreated={(groupId: string) => {
                      // After creation, show share dialog informally then go to dashboard
                      try {
                        // show a simple share via prompt (could be replaced with a nicer modal)
                        const shareText = `Join my group: ${groupId}`;
                        navigator.clipboard?.writeText(shareText);
                        alert('Group created and invite copied to clipboard: ' + shareText);
                      } catch (e) {
                        // ignore clipboard errors
                        alert('Group created: ' + groupId);
                      }

                      setCurrentView('dashboard');
                    }}
                    onCancel={() => setCurrentView('dashboard')}
                  />
                )}
                {currentView === 'join' && (
                  <JoinGroup
                    onJoined={(groupId: string) => {
                      alert('Joined group: ' + groupId);
                      setCurrentView('dashboard');
                    }}
                    onCancel={() => setCurrentView('dashboard')}
                  />
                )}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}

function App(): JSX.Element {
  console.log('App component rendering');
  
  // Check for development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Add error handling to catch and log any errors during initial render
  try {
    // Normal app initialization
    return (
      <ErrorBoundary>
        <AuthProvider>
          <CanisterProvider>
            <F1LiveDataProvider>
              <AppContent />
            </F1LiveDataProvider>
          </CanisterProvider>
        </AuthProvider>
        
        {isDevelopment && (
          <div className="fixed bottom-4 right-4">
            <button
              onClick={() => {
                alert('Development mode active');
              }}
              className="bg-gray-700 text-white px-3 py-1 text-xs rounded"
            >
              Development Mode
            </button>
          </div>
        )}
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error rendering App:', error);
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Application Error</h1>
        <p className="mb-4">Something went wrong while initializing the application.</p>
        <pre className="bg-gray-800 p-4 rounded overflow-auto">
          {error instanceof Error ? error.toString() : 'Unknown error'}
        </pre>
      </div>
    );
  }
}

export default App;
