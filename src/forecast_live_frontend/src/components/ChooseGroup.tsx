import React from 'react';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onChooseCreate: () => void;
  onChooseJoin: () => void;
};

export default function ChooseGroup({ onChooseCreate, onChooseJoin }: Props) {
  const auth = useAuth();
  const shortId = auth.user?.principalText ? auth.user.principalText.slice(0, 8) : 'Racer';

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-gray-800/60 via-gray-900 to-black/60 p-1 rounded-xl shadow-xl transform transition-all hover:scale-[1.01]">
      <div className="bg-card p-6 rounded-lg">
        <div className="mb-4">
          <h2 className="text-2xl font-extrabold">Welcome <span className="text-primary">{shortId}</span>!</h2>
          <p className="text-gray-300 mt-2">Choose to create a new group or join an existing one to start predicting together.</p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={onChooseCreate}
            className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-lg shadow-md transition-colors"
          >
            Create a group
          </button>
          <button
            onClick={onChooseJoin}
            className="flex-1 border border-gray-700 hover:border-gray-500 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Join a group
          </button>
        </div>
      </div>
    </div>
  );
}
