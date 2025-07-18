import React, { createContext, useContext, useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { useAuth } from './AuthContext';
import appConfig from '../config/appConfig';

const CanisterContext = createContext();

export function useCanister() {
  const context = useContext(CanisterContext);
  if (!context) {
    throw new Error('useCanister must be used within a CanisterProvider');
  }
  return context;
}

// Canister ID from config
const CANISTER_ID = appConfig.api.canisterId;

// Define the canister interface
const idlFactory = ({ IDL }) => {
  const Prediction = IDL.Record({
    userId: IDL.Principal,
    prediction: IDL.Vec(IDL.Text),
    submittedAt: IDL.Int,
    isForSprint: IDL.Bool,
  });

  const RaceData = IDL.Record({
    lap: IDL.Nat,
    positions: IDL.Vec(IDL.Text),
  });

  const UserScore = IDL.Record({
    userId: IDL.Principal,
    totalScore: IDL.Float64,
    lapScores: IDL.Vec(IDL.Float64),
  });

  return IDL.Service({
    storePrediction: IDL.Func([IDL.Principal, IDL.Vec(IDL.Text), IDL.Bool], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
    getUserPrediction: IDL.Func([IDL.Principal], [IDL.Opt(Prediction)], ['query']),
    getUserSprintPrediction: IDL.Func([IDL.Principal], [IDL.Opt(Prediction)], ['query']),
    getAllPredictions: IDL.Func([], [IDL.Vec(Prediction)], ['query']),
    setRaceData: IDL.Func([IDL.Vec(RaceData)], [], []),
    getRaceData: IDL.Func([], [IDL.Vec(RaceData)], ['query']),
    updateCurrentLap: IDL.Func([IDL.Nat], [], []),
    getCurrentLap: IDL.Func([], [IDL.Nat], ['query']),
    calculateUserScore: IDL.Func([IDL.Principal], [IDL.Opt(UserScore)], ['query']),
    getLeaderboard: IDL.Func([], [IDL.Vec(UserScore)], ['query']),
    initializeSampleData: IDL.Func([], [], []),
  });
};

export function CanisterProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeActor();
    }
  }, [isAuthenticated, user]);

  const initializeActor = async () => {
    try {
      setLoading(true);
      console.log('Initializing canister actor with auth type:', user?.authType);
      
      // If we're using real authentication
      if (!appConfig.auth.useMockAuth) {
        let identity;
        
        // Get identity from appropriate auth provider
        if (user?.authType === 'nfid') {
          // For NFID, we need to get identity from the AuthContext user
          identity = user.principal;
          console.log('Using NFID identity for canister calls:', user.principalText);
        } else {
          console.error('No valid identity found for canister calls');
          throw new Error('Authentication required for canister interaction');
        }
        
        const agent = new HttpAgent({
          identity: identity,
          host: appConfig.api.host,
        });
        
        // In development environment, we might need to fetch the root key
        if (process.env.NODE_ENV !== 'production') {
          await agent.fetchRootKey().catch(err => {
            console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
            console.error(err);
          });
        }
        
        // Create the actor with the agent
        const realActor = Actor.createActor(idlFactory, {
          agent,
          canisterId: CANISTER_ID,
        });
        
        setActor(realActor);
        console.log('Real canister actor created successfully');
      } else {
        console.log('Using mock actor for development');
        // For development, we'll use a mock actor
        const mockActor = createMockActor();
        setActor(mockActor);
        
        // Initialize sample data
        await mockActor.initializeSampleData();
      }
    } catch (error) {
      console.error('Failed to initialize canister:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock actor for development
  const createMockActor = () => {
    let predictions = new Map();
    let raceData = [];
    let currentLap = 0;

    const calculateLapScore = (userPrediction, actualPositions) => {
      let lapScore = 0;
      
      for (let i = 0; i < userPrediction.length; i++) {
        const predictedDriver = userPrediction[i];
        const actualPosition = actualPositions.indexOf(predictedDriver);
        
        if (actualPosition !== -1) {
          const positionDiff = Math.abs(actualPosition - i);
          let multiplier = 0;
          
          switch (positionDiff) {
            case 0: multiplier = 1.0; break;
            case 1: multiplier = 0.5; break;
            case 2: multiplier = 0.25; break;
            case 3: multiplier = 0.125; break;
            default: multiplier = 0.0; break;
          }
          
          // Points based on predicted position (P1 = 25, P2 = 18, etc.)
          const positionPoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1][i] || 0;
          lapScore += positionPoints * multiplier;
        }
      }
      
      return lapScore;
    };

    return {
      storePrediction: async (userId, prediction, isForSprint) => {
        if (currentLap > 30) {
          return { err: 'Predictions are closed after lap 30' };
        }
        
        predictions.set(userId.toText(), {
          userId,
          prediction,
          submittedAt: Date.now(),
          isForSprint: isForSprint || false,
        });
        
        console.log(`Stored prediction for user ${userId.toText()}, sprint: ${isForSprint}`);
        return { ok: null };
      },

      getUserPrediction: async (userId) => {
        console.log(`Getting prediction for user ${userId.toText()}`);
        const pred = predictions.get(userId.toText());
        if (pred && !pred.isForSprint) {
          return pred;
        }
        return null;
      },
      
      getUserSprintPrediction: async (userId) => {
        console.log(`Getting sprint prediction for user ${userId.toText()}`);
        const pred = predictions.get(userId.toText());
        if (pred && pred.isForSprint) {
          return pred;
        }
        return null;
      },

      getAllPredictions: async () => {
        return Array.from(predictions.values());
      },

      setRaceData: async (data) => {
        raceData = data;
        console.log("Race data set:", data);
      },

      getRaceData: async () => {
        return raceData;
      },

      updateCurrentLap: async (lap) => {
        // Only update if it's a new lap
        if (lap !== currentLap) {
          console.log(`Mock canister: Updating lap from ${currentLap} to ${lap}`);
          currentLap = lap;
          
          // If we don't have race data for this lap, generate some
          if (!raceData.find(data => data.lap === lap)) {
            // Generate random positions for the new lap
            const drivers = ['VER', 'HAM', 'LEC', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'];
            const shuffled = [...drivers].sort(() => Math.random() - 0.5);
            
            // Add the new lap data
            raceData.push({
              lap: lap,
              positions: shuffled
            });
            
            console.log(`Generated race data for lap ${lap}:`, shuffled);
          }
        }
      },

      getCurrentLap: async () => {
        return currentLap;
      },
      
      setCurrentRaceType: async (isSprintRace) => {
        console.log(`Mock canister: Setting race type to ${isSprintRace ? 'sprint' : 'main'}`);
        // This would update the race type in a real canister
      },

      calculateUserScore: async (userId) => {
        // First, check if the user has any prediction
        const userPrediction = predictions.get(userId.toText());
        if (!userPrediction) {
          console.log(`No prediction found for user ${userId.toText()}`);
          return null;
        }

        console.log(`Found prediction for user ${userId.toText()}:`, userPrediction);
        
        const lapScores = []; // Individual lap scores, not cumulative
        let totalScore = 0;

        if (raceData.length === 0) {
          console.log("No race data available to calculate scores");
          return {
            userId,
            totalScore: 0,
            lapScores: [0],
          };
        }

        // Sort race data by lap to ensure we process laps in order
        const sortedRaceData = [...raceData].sort((a, b) => a.lap - b.lap);
        
        for (const raceEntry of sortedRaceData) {
          if (raceEntry.lap <= currentLap) {
            const lapScore = calculateLapScore(userPrediction.prediction, raceEntry.positions);
            console.log(`Lap ${raceEntry.lap} score for user ${userId.toText()}: ${lapScore}`);
            
            lapScores.push(lapScore); // Individual score for this lap
            totalScore += lapScore; // Total for leaderboard ranking
          }
        }

        return {
          userId,
          totalScore,
          lapScores, // Array of individual lap scores
        };
      },

      getLeaderboard: async () => {
        const leaderboard = [];
        
        // Process all users with predictions
        for (const [userId, prediction] of predictions.entries()) {
          try {
            // Calculate user scores and add to leaderboard
            const userScore = await this.calculateUserScore(prediction.userId);
            
            if (userScore) {
              console.log(`Adding user ${userId} to leaderboard with score ${userScore.totalScore}`);
              leaderboard.push(userScore);
            }
          } catch (error) {
            console.error(`Error calculating score for user ${userId}:`, error);
          }
        }
        
        // Sort by total score descending
        return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
      },

      initializeSampleData: async () => {
        raceData = [
          { lap: 1, positions: ['VER', 'LEC', 'HAM', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'] },
          { lap: 2, positions: ['VER', 'HAM', 'LEC', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'] },
          { lap: 3, positions: ['HAM', 'VER', 'LEC', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'] },
          { lap: 4, positions: ['HAM', 'VER', 'NOR', 'LEC', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'] },
          { lap: 5, positions: ['VER', 'HAM', 'NOR', 'LEC', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'] },
        ];
        currentLap = 1;
        
        // Add some mock users for testing group functionality
        const mockUsers = [
          {
            userId: 'friend1-user-12345',
            prediction: ['HAM', 'VER', 'LEC', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'],
            submittedAt: Date.now() - 1000
          },
          {
            userId: 'friend2-user-67890',
            prediction: ['VER', 'LEC', 'HAM', 'RUS', 'NOR', 'ALO', 'SAI', 'TSU', 'PER', 'HUL'],
            submittedAt: Date.now() - 2000
          },
          {
            userId: 'friend3-user-11111',
            prediction: ['LEC', 'VER', 'HAM', 'NOR', 'SAI', 'ALO', 'RUS', 'TSU', 'PER', 'HUL'],
            submittedAt: Date.now() - 3000
          }
        ];
        
        // Add mock users to predictions
        mockUsers.forEach(user => {
          predictions.set(user.userId, {
            userId: { toText: () => user.userId },
            prediction: user.prediction,
            submittedAt: user.submittedAt
          });
        });
      },
    };
  };

  const value = {
    actor,
    loading,
    canisterId: CANISTER_ID,
  };

  return (
    <CanisterContext.Provider value={value}>
      {children}
    </CanisterContext.Provider>
  );
}
