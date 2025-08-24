import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface LeaderboardUser {
  userId: string;
  username: string;
  points: number;
  movement: number; // Positive for up, negative for down, 0 for no change
  previousRank?: number;
  predictions?: { driverId: string; predictedPosition: number }[];
}

export interface LeaderboardProps {
  users: LeaderboardUser[];
  raceName?: string;
  currentLap?: number;
  totalLaps?: number;
  status?: 'Green Flag' | 'Safety Car' | 'Red Flag';
  groupName?: string;
  actualPositions?: { driverId: string; position: number }[];
  autoSimulate?: boolean;
  onUserClick?: (userId: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  users: initialUsers, 
  raceName = "Monaco Grand Prix",
  currentLap = 0,
  totalLaps = 78,
  status = "Green Flag",
  groupName = "Friends Group",
  actualPositions = [],
  autoSimulate = false,
  onUserClick
}) => {
  // State for managing users with animations
  const [users, setUsers] = useState<LeaderboardUser[]>(() => {
    // Initialize with previous ranks matching current ranks
    return initialUsers.map((user, index) => ({
      ...user,
      previousRank: index
    }));
  });
  
  // Store previous lap for updates
  const prevLapRef = useRef(currentLap);
  
  // Timer for simulated updates
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate random driver positions for simulation
  const generateRandomPositions = () => {
    const drivers = [
      "VER", "HAM", "LEC", "NOR", "SAI", 
      "PER", "RUS", "ALO", "PIA", "GAS"
    ];
    
    // Shuffle the drivers randomly for new positions
    return drivers
      .map(driverId => ({ driverId, position: 0 }))
      .sort(() => Math.random() - 0.5)
      .map((driver, index) => ({ 
        ...driver, 
        position: index + 1 
      }));
  };
  
  // Calculate points based on prediction accuracy
  const calculatePoints = (
    predictions: { driverId: string; predictedPosition: number }[],
    actualPositions: { driverId: string; position: number }[]
  ): number => {
    if (!predictions || !predictions.length || !actualPositions || !actualPositions.length) {
      return 0;
    }
    
    return predictions.reduce((totalPoints, prediction) => {
      const actual = actualPositions.find(pos => pos.driverId === prediction.driverId);
      if (!actual) return totalPoints;
      
      const positionDiff = Math.abs(prediction.predictedPosition - actual.position);
      
      // Scoring logic based on accuracy
      if (positionDiff === 0) return totalPoints + 10; // Exact position: 100% points
      if (positionDiff === 1) return totalPoints + 5;  // 1 position off: 50%
      if (positionDiff === 2) return totalPoints + 2.5; // 2 positions off: 25%
      if (positionDiff === 3) return totalPoints + 1.25; // 3 positions off: 12.5%
      return totalPoints; // Beyond that: 0 points
    }, 0);
  };
  
  // Sort users by points and calculate rank changes
  const updateLeaderboard = (newPositions: { driverId: string; position: number }[]) => {
    setUsers(prevUsers => {
      // Calculate new points for each user
      const usersWithUpdatedPoints = prevUsers.map(user => {
        // Use stored predictions or generate random ones for demo
        const predictions = user.predictions || [
          { driverId: "VER", predictedPosition: Math.floor(Math.random() * 10) + 1 },
          { driverId: "HAM", predictedPosition: Math.floor(Math.random() * 10) + 1 },
          { driverId: "LEC", predictedPosition: Math.floor(Math.random() * 10) + 1 },
          { driverId: "NOR", predictedPosition: Math.floor(Math.random() * 10) + 1 },
          { driverId: "SAI", predictedPosition: Math.floor(Math.random() * 10) + 1 }
        ];
        
        // Store previous points for animation
        const previousPoints = user.points;
        
        // Calculate new points
        const newPoints = Math.round(previousPoints + calculatePoints(predictions, newPositions));
        
        return {
          ...user,
          points: newPoints,
          previousPoints
        };
      });
      
      // Sort by points (highest first)
      const sortedUsers = [...usersWithUpdatedPoints].sort((a, b) => b.points - a.points);
      
      // Calculate rank changes and movement
      return sortedUsers.map((user, currentRank) => {
        const previousRank = prevUsers.findIndex(u => u.userId === user.userId);
        const movement = previousRank - currentRank;
        
        return {
          ...user,
          previousRank,
          movement,
        };
      });
    });
  };
  
  // Run simulation on auto or lap change
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // If auto-simulate is enabled, update every 5 seconds
    if (autoSimulate) {
      timerRef.current = setInterval(() => {
        const newPositions = generateRandomPositions();
        updateLeaderboard(newPositions);
      }, 5000);
    } 
    // Otherwise, update when the lap changes
    else if (currentLap !== prevLapRef.current) {
      const newPositions = actualPositions.length > 0 
        ? actualPositions 
        : generateRandomPositions();
      
      updateLeaderboard(newPositions);
      prevLapRef.current = currentLap;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoSimulate, currentLap, actualPositions]);
  
  // Function to determine status badge color
  const getStatusColor = (): string => {
    switch (status) {
      case 'Green Flag':
        return 'bg-green-500';
      case 'Safety Car':
        return 'bg-yellow-500';
      case 'Red Flag':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Calculate lap progress percentage
  const lapProgressPercentage = Math.round((currentLap / totalLaps) * 100);
  
  return (
    <div className="bg-gray-800 rounded-xl shadow-md p-4 mb-4">
      {/* Race Status Header */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
        <h2 className="text-xl font-bold text-white">{raceName}</h2>
        <div className="flex items-center space-x-3">
          <span className="text-gray-300 text-sm">Lap: {currentLap}/{totalLaps}</span>
          <span className={`${getStatusColor()} text-white text-xs px-2 py-1 rounded-full`}>
            {status}
          </span>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{groupName} Leaderboard</h3>
      
      {/* Table Header */}
      <div className="grid grid-cols-12 text-xs font-medium text-gray-400 uppercase mb-2 px-2">
        <div className="col-span-1">Rank</div>
        <div className="col-span-7">Username</div>
        <div className="col-span-2 text-right">Points</div>
        <div className="col-span-2 text-right">Change</div>
      </div>
      
      {/* Animated Leaderboard */}
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {users.map((user, index) => (
            <motion.div 
              key={user.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                backgroundColor: user.movement > 0 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : user.movement < 0 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'rgba(55, 65, 81, 0.5)',
                transition: { duration: 0.3 }
              }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-12 items-center p-3 rounded cursor-pointer hover:bg-gray-700"
              layout
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              whileHover={{ scale: 1.01 }}
            >
              {/* Rank */}
              <div className="col-span-1 font-semibold">
                <motion.span 
                  key={`rank-${user.userId}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-white text-xs"
                >
                  {index + 1}
                </motion.span>
              </div>
              
              {/* Username */}
                          <div className="col-span-7 font-medium text-white">
                            <button
                              onClick={() => typeof (onUserClick) === 'function' && onUserClick(user.userId)}
                              className="text-left w-full hover:underline focus:outline-none"
                            >
                              {user.username}
                            </button>
                          </div>
              
              {/* Points */}
              <motion.div 
                className="col-span-2 text-right font-bold text-white"
                key={`points-${user.userId}-${user.points}`}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {user.points}
              </motion.div>
              
              {/* Movement Indicator */}
              <div className="col-span-2 text-right">
                {user.movement !== 0 && (
                  <motion.span 
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.movement > 0 
                        ? 'bg-green-900/40 text-green-400' 
                        : 'bg-red-900/40 text-red-400'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    {user.movement > 0 ? (
                      <>
                        <span className="mr-1">▲</span>
                        <span>{user.movement}</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-1">▼</span>
                        <span>{Math.abs(user.movement)}</span>
                      </>
                    )}
                  </motion.span>
                )}
                
                {user.movement === 0 && (
                  <span className="text-gray-500 text-xs px-2">—</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Leaderboard;
