import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  compact?: boolean;
};

function AuthForm({ compact = false }: Props): React.ReactElement {
  const [loading, setLoading] = useState<boolean>(false);
  const { loginWithInternetIdentity, authError } = useAuth();

  const handleIILogin = async (): Promise<void> => {
    setLoading(true);
    try {
      await loginWithInternetIdentity();
    } catch (error) {
      console.error('Internet Identity login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerClass = compact
    ? 'max-w-sm mx-auto bg-card p-4 rounded-xl shadow-lg'
    : 'max-w-md mx-auto bg-card p-8 rounded-xl shadow-lg';

  const buttonClass = compact
  ? 'w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white py-2 text-sm font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-200'
  : 'w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white py-3 text-lg font-semibold rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-200';

  return (
    <div className={containerClass}>
      {!compact && (
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Forecast Live</h1>
          <p className="text-gray-400 mt-1 text-sm">F1 Prediction Platform</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Internet Identity only */}
        <button
          onClick={handleIILogin}
          disabled={loading}
          className={buttonClass}
        >
          <div className={compact ? 'flex items-center justify-center gap-2' : 'flex items-center justify-center'}>
            <img
              src="https://internetcomputer.org/img/IC_logo.svg"
              alt="Internet Identity"
              className={compact ? 'w-4 h-4' : 'w-5 h-5 mr-2'}
            />
            <span>{loading ? 'Connecting...' : 'Continue with Internet Identity'}</span>
          </div>
        </button>

        {authError && (
          <div className="mt-2 p-2 bg-red-900/50 text-red-200 rounded-md text-sm">
            {authError}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthForm;