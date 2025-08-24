import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from './AuthForm';

const sampleTicker = [
  'Hamilton +2.3s',
  'Leclerc P2',
  'Verstappen DRS active',
  'Perez P3',
  'Sainz pit in 2 laps',
  'Safety car deployed',
];

// real AuthContext and AuthForm imported above

const LandingPage = () => {
  const { loading } = useAuth();
  const authRef = useRef<HTMLDivElement>(null);
  const [tickerText, setTickerText] = useState(sampleTicker[0]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [usersCount, setUsersCount] = useState(26709);
  const [predictionsCount, setPredictionsCount] = useState(288025);
  const [racesCount, setRacesCount] = useState(400);

  const topDrivers = [
    { name: 'Verstappen', team: 'Red Bull Racing', pts: 312, color: 'from-blue-600 to-blue-800' },
    { name: 'Hamilton', team: 'Mercedes AMG', pts: 287, color: 'from-cyan-400 to-cyan-600' },
    { name: 'Leclerc', team: 'Ferrari', pts: 265, color: 'from-red-500 to-red-700' },
  ];

  const features = [
    {
      icon: '🏁',
      title: 'Live Race Tracking',
      description: 'Real-time position updates, gap analysis, and interactive race timeline with replay functionality.'
    },
    {
      icon: '👥',
      title: 'Private Groups',
      description: 'Create leagues with friends, set custom rules, and compete in exclusive leaderboards.'
    },
    {
      icon: '🏆',
      title: 'Smart Predictions',
      description: 'AI-powered insights, historical data analysis, and seasonal championship tracking.'
    }
  ];

  // Ticker rotation
  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex((i) => {
        const next = (i + 1) % sampleTicker.length;
        setTickerText(sampleTicker[next]);
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Animated counters
  useEffect(() => {
    const id1 = setInterval(() => setUsersCount((v) => Math.min(50000, v + Math.ceil(Math.random() * 50))), 200);
    const id2 = setInterval(() => setPredictionsCount((v) => Math.min(2000000, v + Math.ceil(Math.random() * 500))), 150);
    const id3 = setInterval(() => setRacesCount((v) => Math.min(450, v + 1)), 2000);
    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); };
  }, []);

  const scrollToAuth = () => {
    if (authRef.current) {
      authRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-hidden">
      {/* Live Ticker Bar */}
      <div className="relative w-full bg-gradient-to-r from-red-600/20 via-orange-500/10 to-yellow-500/20 backdrop-blur-sm border-b border-white/10">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wider bg-red-600/20 px-2 py-1 rounded-full border border-red-500/30">LIVE</span>
            </div>
            <div className="overflow-hidden max-w-md">
              <div className="animate-marquee whitespace-nowrap text-sm font-medium">
                <span className="mr-8">{tickerText}</span>
                <span className="mr-8 text-orange-300">🏆 Join 26K+ fans making predictions</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block text-xs text-gray-300 font-mono">
            Updated now
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-16 items-start max-w-7xl mx-auto">
          
          {/* Hero Section - Takes up 3/5 of the width */}
          <div className="xl:col-span-3 space-y-12">
            {/* Brand Header */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3">
                    <svg className="w-8 h-8 text-white transform -rotate-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-black text-xs font-bold">F1</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-orange-400 uppercase tracking-wider">Formula 1 Predictions</div>
                  <div className="text-xs text-gray-400">Powered by Internet Computer</div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl xl:text-7xl font-black leading-tight">
                  <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Predict the
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
                    Perfect Race
                  </span>
                </h1>
                
                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  Turn every Grand Prix into a social competition. Create groups, submit predictions before lights out, and experience live race tracking like you're in the paddock.
                </p>
              </div>
            </div>

            {/* Interactive Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="group cursor-pointer">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-red-500/30 transition-all duration-500 hover:transform hover:scale-105">
                  <div className="text-3xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    {usersCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">Active Predictors</div>
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse users-bar-width"></div>
                  </div>
                </div>
              </div>

              <div className="group cursor-pointer">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-yellow-500/30 transition-all duration-500 hover:transform hover:scale-105">
                  <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    {predictionsCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">Predictions Made</div>
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse predictions-bar-width"></div>
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-pulse predictions-bar-width"></div>
                  </div>
                </div>
              </div>

              <div className="group cursor-pointer">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-500 hover:transform hover:scale-105">
                  <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {racesCount}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">Races Tracked</div>
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse races-bar-width"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Leaderboard Preview */}
            <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Championship Standings</h3>
                    <p className="text-gray-400">Current season leaders</p>
                  </div>
                  <div className="text-sm text-orange-400 font-semibold px-3 py-1 bg-orange-400/10 rounded-full border border-orange-400/20">
                    Live Preview
                  </div>
                </div>
                
                <div className="space-y-4">
                  {topDrivers.map((driver, index) => (
                    <div key={driver.name} className="group flex items-center justify-between p-4 bg-gradient-to-r from-white/5 to-white/2 rounded-xl border border-white/5 hover:border-white/20 transition-all duration-300">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${driver.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">{driver.name}</div>
                          <div className="text-sm text-gray-400">{driver.team}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white">{driver.pts}</div>
                        <div className="text-xs text-gray-400">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <button
                onClick={scrollToAuth}
                className="group relative bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-4 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-red-500/25"
              >
                <span className="relative z-10 text-lg">Start Predicting Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-400 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>

          {/* Auth Section - Takes up 2/5 of the width */}
          <div ref={authRef} className="xl:col-span-2">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sticky top-8">
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
                  <div className="p-8">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-white mb-2">Join the Competition</h2>
                      <p className="text-gray-400">Sign in with Internet Identity for secure, instant access</p>
                    </div>

                    <AuthForm />

                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center space-x-3 text-sm text-blue-200">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1L3 5v6c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V5l-9-4z"/>
                        </svg>
                        <span>Powered by Internet Computer blockchain for maximum security</span>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="text-xs text-gray-500">
                        By signing in, you agree to our terms of service and privacy policy.
                        Your profile is created automatically upon first login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-24 bg-gradient-to-b from-transparent to-black/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent"></div>
        
        <div className="relative container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl xl:text-5xl font-black text-white mb-4">
              Why Choose <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Forecast Live</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Experience F1 like never before with our cutting-edge prediction platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-white/10 hover:border-red-500/30 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10">
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/60 backdrop-blur-sm border-t border-white/10 py-12">
        <div className="container mx-auto px-6 text-center space-y-4">
          <div className="flex justify-center items-center space-x-4 text-gray-400">
            <span>© 2025 Forecast Live</span>
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            <span>Powered by Internet Computer</span>
          </div>
          <p className="text-sm text-gray-500">
            Formula 1 is a trademark of Formula One Licensing BV. This is an independent prediction platform.
          </p>
        </div>
      </footer>

      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-marquee {
            animation: marquee 15s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default LandingPage;