import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import PredictionUpload from './components/PredictionUpload';
import Dashboard from './components/Dashboard';
import LiveRaceTracker from './components/LiveRaceTracker';
import RaceSchedule from './components/RaceSchedule';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CanisterProvider } from './contexts/CanisterContext';
import { F1LiveDataProvider } from './contexts/F1LiveDataContext';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [currentView, setCurrentView] = useState('upload');

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
                  onClick={() => setCurrentView('live')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'live' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Live Race
                </button>
                <button
                  onClick={() => setCurrentView('schedule')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'schedule' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>

            {currentView === 'upload' && <PredictionUpload />}
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'live' && <LiveRaceTracker />}
            {currentView === 'schedule' && <RaceSchedule />}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CanisterProvider>
        <F1LiveDataProvider>
          <AppContent />
        </F1LiveDataProvider>
      </CanisterProvider>
    </AuthProvider>
  );
}

export default App;
