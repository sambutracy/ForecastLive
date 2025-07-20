import React, { useState } from 'react';
import TestComponent from './components/TestComponent';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import PredictionUpload from './components/PredictionUpload';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardSimple from './components/DashboardSimple';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CanisterProvider } from './contexts/CanisterContext';
import { F1LiveDataProvider } from './contexts/F1LiveDataContext';

function AppContent() {
  console.log('AppContent rendering');
  const { isAuthenticated } = useAuth();
  console.log('isAuthenticated:', isAuthenticated);
  const [currentView, setCurrentView] = useState('dashboard');
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {!isAuthenticated ? (
          <AuthForm />
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
                <button
                  onClick={() => setCurrentView('test')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'test' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Test Component
                </button>
              </div>
            </div>

            {currentView === 'dashboard' && <DashboardSimple />}
            {currentView === 'upload' && <PredictionUpload />}
            {currentView === 'test' && <TestComponent />}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  console.log('App component rendering');
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CanisterProvider>
          <F1LiveDataProvider>
            <AppContent />
          </F1LiveDataProvider>
        </CanisterProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
