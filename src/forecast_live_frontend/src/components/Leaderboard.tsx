import React from 'react';

export interface LeaderboardUser {
  userId: string;
  username: string;
  points: number;
  movement: number; // Positive for up, negative for down, 0 for no change
}

export interface LeaderboardProps {
  users: LeaderboardUser[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ users }) => {
  return (
    <div className="bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      <h2 className="text-xl font-bold text-white mb-4">Live Leaderboard</h2>
      
      <div className="space-y-2">
        {users.map((user, index) => (
          <div 
            key={user.userId} 
            className="flex justify-between items-center p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center">
              <span className="text-gray-400 font-medium w-6 text-right mr-3">#{index + 1}</span>
              <span className="text-white">{user.username}</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-white font-bold mr-3">{user.points}</span>
              
              {user.movement !== 0 && (
                <span 
                  className={`flex items-center ${
                    user.movement > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {user.movement > 0 ? (
                    <>
                      <span className="text-xs mr-1">▲</span>
                      <span className="text-xs">{user.movement}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs mr-1">▼</span>
                      <span className="text-xs">{Math.abs(user.movement)}</span>
                    </>
                  )}
                </span>
              )}
              
              {user.movement === 0 && (
                <span className="text-gray-400 text-xs">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
