import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from './AuthForm';

const LandingPage: React.FC = () => {
  const { loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left side: Landing page content */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              <span className="text-primary">Forecast</span> Live
            </h1>
            <h2 className="text-2xl md:text-3xl font-medium text-gray-300 mb-6">
              Formula 1 Prediction Platform
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Test your F1 knowledge and compete with other fans by predicting race outcomes. 
              Login with your Internet Computer identity to get started.
            </p>
            
            <div className="mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-primary text-2xl font-bold mb-2">Secure Identity</div>
                  <p className="text-gray-400">Built on Internet Computer with NFID and Internet Identity</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-primary text-2xl font-bold mb-2">Real-time Data</div>
                  <p className="text-gray-400">Live race tracking and immediate results</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block">
              <h3 className="text-xl font-semibold text-white mb-4">How it works:</h3>
              <ol className="list-decimal list-inside text-gray-300 space-y-2 pl-4">
                <li>Login with your NFID or Internet Identity</li>
                <li>Submit your race predictions before the start</li>
                <li>Watch the live tracker during the race</li>
                <li>See your score and ranking instantly</li>
              </ol>
            </div>
          </div>
          
          {/* Right side: Auth form */}
          <div className="order-first md:order-last">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <AuthForm />
            )}
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Platform Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-primary text-5xl mb-4">🏎️</div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Race Tracking</h3>
              <p className="text-gray-400">Follow the race in real-time with our interactive tracker showing positions, gaps, and your prediction accuracy.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-primary text-5xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-400">Get insights and predictions from our machine learning models trained on historical F1 data.</p>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="text-primary text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-white mb-2">Leaderboards</h3>
              <p className="text-gray-400">Compete with friends and the community. Rise through the ranks with accurate predictions.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-8 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© 2025 Forecast Live. Powered by Internet Computer.</p>
          <p className="mt-2">Formula 1 is a trademark of Formula One Licensing BV.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
