import React, { useState, JSX } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import PredictionUpload from './components/PredictionUpload';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CanisterProvider } from './contexts/CanisterContext';
import { F1LiveDataProvider } from './contexts/F1LiveDataContext';

function AppContent(): JSX.Element {
  console.log('AppContent rendering');
  
  // Wrap auth context access in try/catch to handle any potential errors
  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
    console.log('isAuthenticated:', isAuthenticated);
  } catch (error) {
    console.error('Error accessing auth context:', error);
  }
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload'>('dashboard');
  
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
