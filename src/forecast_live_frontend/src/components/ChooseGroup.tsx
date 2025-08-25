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
    <div className="min-h-[40vh] flex items-start md:items-center justify-center px-4">
      <div className="w-full max-w-lg bg-gradient-to-br from-slate-800/60 via-slate-900/60 to-black/60 p-1 rounded-2xl shadow-2xl transform transition-all hover:scale-[1.01]">
        <div className="bg-card p-8 rounded-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-none w-12 h-12 rounded-full bg-primary/20 text-primary grid place-items-center text-2xl">🏁</div>
            <div>
              <h2 className="text-2xl font-extrabold">Welcome <span className="text-primary">{shortId}</span>!</h2>
              <p className="text-gray-300 mt-1 text-sm">Create a private group or join an existing one to compete with friends.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onChooseCreate}
              aria-label="Create a new group"
              className="flex items-center justify-center gap-3 bg-primary text-white px-4 py-3 rounded-lg shadow hover:bg-primary/95 focus:outline-none focus:ring-4 focus:ring-primary/30 transition"
            >
              <span className="font-medium">Create a group</span>
            </button>

            <button
              onClick={onChooseJoin}
              aria-label="Join existing group"
              className="flex items-center justify-center gap-3 border border-gray-700 text-white px-4 py-3 rounded-lg hover:border-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-700/30 transition"
            >
              <span className="font-medium">Join a group</span>
            </button>
          </div>

          <p className="text-gray-400 text-xs mt-4">Tip: you can share group ids with friends. They look like <span className="font-mono text-sm">grp-abc123</span>.</p>
        </div>
      </div>
    </div>
  );
}
