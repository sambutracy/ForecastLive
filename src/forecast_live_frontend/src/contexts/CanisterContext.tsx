import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { useAuth } from './AuthContext';
import appConfig from '../config/appConfig';
import ENV from '../config/env';

// Define the host for IC API calls
const IC_HOST = appConfig.IC_HOST;

// TypeScript interfaces
interface Prediction {
  userId: Principal;
  prediction: string[];
  submittedAt: number;
  isForSprint: boolean;
}

interface RaceData {
  lap: number;
  positions: string[];
}

interface UserScore {
  userId: Principal;
  totalScore: number;
  lapScores: number[];
}

interface MockActor {
  storePrediction: (userId: Principal, prediction: string[], isForSprint: boolean) => Promise<{ ok: null } | { err: string }>;
  getUserPrediction: (userId: Principal) => Promise<Prediction | null>;
  getUserSprintPrediction: (userId: Principal) => Promise<Prediction | null>;
  getAllPredictions: () => Promise<Prediction[]>;
  setRaceData: (data: RaceData[]) => Promise<void>;
  getRaceData: () => Promise<RaceData[]>;
  updateCurrentLap: (lap: number) => Promise<void>;
  getCurrentLap: () => Promise<number>;
  setCurrentRaceType?: (isSprintRace: boolean) => Promise<void>;
  calculateUserScore: (userId: Principal) => Promise<UserScore | null>;
  getLeaderboard: () => Promise<UserScore[]>;
  initializeSampleData: () => Promise<void>;
}

interface CanisterContextType {
  actor: any;
  backendActor: any;
  f1DataService: any;
  predictionService: any;
  aiPredictionService: any;
  loading: boolean;
  isActorAvailable: boolean;
  canisterId: string | null;
}

const CanisterContext = createContext<CanisterContextType | null>(null);

export function useCanister(): CanisterContextType {
  const context = useContext(CanisterContext);
  if (!context) {
    throw new Error('useCanister must be used within a CanisterProvider');
  }
  return context;
}

// Get canister ID from config
const getCanisterId = (): string | null => {
  // Get the canister ID from appConfig
  const canisterId = appConfig.ic.canisterIds.forecastLiveBackend;
  
  if (!canisterId) {
    console.error('No canister ID configured for forecast_live_backend');
    return ENV.IS_PRODUCTION 
      ? null  // In production, we should never use a fallback
      : ENV.FORECAST_LIVE_BACKEND_CANISTER_ID; // Use our environment variable
  }
  
  return canisterId;
};

// Define the canister interface
const idlFactory = ({ IDL }: { IDL: any }) => {
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

interface CanisterProviderProps {
  children: ReactNode;
}

export function CanisterProvider({ children }: CanisterProviderProps): React.ReactElement {
  const { isAuthenticated, user, identity } = useAuth();
  const [actor, setActor] = useState<any>(null);
  const [backendActor, setBackendActor] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isActorAvailable, setIsActorAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && (user || identity)) {
      initializeActor();
    }
  }, [isAuthenticated, user, identity]);

  // Expose backendActor on window for legacy access patterns used elsewhere
  useEffect(() => {
    try {
      (window as any).canisterContext = (window as any).canisterContext || {};
      (window as any).canisterContext.backendActor = backendActor;
    } catch (err) {
      console.warn('Unable to set window.canisterContext', err);
    }
  }, [backendActor]);

  const initializeActor = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('Initializing canister actor with auth type:', user?.authType);
      
      // If we have a valid identity from auth context
      if (identity) {
        const canisterId = getCanisterId();
        
        // Make sure we have a valid canister ID
        if (!canisterId) {
          console.error('No valid canister ID found. Please ensure canister IDs are properly configured.');
          throw new Error('Missing canister ID configuration');
        }
        
        // Ensure we have the right identity type
        const authIdentity = identity as Identity;
        console.log('Using identity for canister calls:', authIdentity.getPrincipal().toString());
        console.log('Canister ID:', canisterId);
        
        try {
          const agent = new HttpAgent({
            identity: authIdentity,
            host: appConfig.IC_HOST,
          });
          
          // In development environment, we might need to fetch the root key
          if (!ENV.IS_PRODUCTION) {
            await agent.fetchRootKey().catch(err => {
              console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
              console.error(err);
            });
          }
          
          // Create the actor with the agent
          const realActor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
          });
          
          setActor(realActor);
          setBackendActor(realActor); // Set the backend actor specifically
          setIsActorAvailable(true);
          console.log('Real canister actor created successfully');
        } catch (error) {
          console.error('Error creating agent or actor:', error);
          // Fall back to mock
          createAndSetMockActor();
        }
      } else {
        createAndSetMockActor();
      }
    } catch (error) {
      console.error('Failed to initialize canister:', error);
      createAndSetMockActor();
    } finally {
      setLoading(false);
    }
  };

  const createAndSetMockActor = async (): Promise<void> => {
    console.log('Using mock actor for development');
    // For development, we'll use a mock actor
    const mockActor = createMockActor();
    setActor(mockActor);
    setBackendActor(mockActor);
    setIsActorAvailable(true);
    
    // Initialize sample data
    await mockActor.initializeSampleData();
    // Provide a simple mock usersActor to satisfy ensureUserProfile/getGroups calls from AuthContext/Dashboard
    const mockUsersActor = {
      ensureUserProfile: async (displayName: any, avatarUrl: any, authType: any) => {
        // Return a minimal profile object similar to canister response
        const profile = {
          // Do not expose a development principal; return null principal to avoid accidental auth bypass
          principal: null,
          displayName: displayName || 'MockUser',
          avatarUrl: null,
          authType: authType || 'mock',
          createdAt: Date.now(),
          groupsCreated: [],
          groupsJoined: []
        };
        return { ok: profile };
      },
      getGroups: async (principal: any) => {
        return ['Friends Group', 'Office Pool'];
      }
    };
    (window as any).canisterContext = (window as any).canisterContext || {};
    (window as any).canisterContext.usersActor = mockUsersActor;
  };

  // Mock actor for development
  const createMockActor = (): MockActor => {
    let predictions = new Map<string, Prediction>();
    let raceData: RaceData[] = [];
    let currentLap = 0;

    const calculateLapScore = (userPrediction: string[], actualPositions: string[]): number => {
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
      storePrediction: async (userId: Principal, prediction: string[], isForSprint: boolean) => {
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

      getUserPrediction: async (userId: Principal) => {
        console.log(`Getting prediction for user ${userId.toText()}`);
        const pred = predictions.get(userId.toText());
        if (pred && !pred.isForSprint) {
          return pred;
        }
        return null;
      },
      
      getUserSprintPrediction: async (userId: Principal) => {
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

      setRaceData: async (data: RaceData[]) => {
        raceData = data;
        console.log("Race data set:", data);
      },

      getRaceData: async () => {
        return raceData;
      },

      updateCurrentLap: async (lap: number) => {
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
      
      setCurrentRaceType: async (isSprintRace: boolean) => {
        console.log(`Mock canister: Setting race type to ${isSprintRace ? 'sprint' : 'main'}`);
        // This would update the race type in a real canister
      },

      calculateUserScore: async (userId: Principal) => {
        // First, check if the user has any prediction
        const userPrediction = predictions.get(userId.toText());
        if (!userPrediction) {
          console.log(`No prediction found for user ${userId.toText()}`);
          return null;
        }

        console.log(`Found prediction for user ${userId.toText()}:`, userPrediction);
        
        const lapScores: number[] = []; // Individual lap scores, not cumulative
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
        const leaderboard: UserScore[] = [];
        
        // Process all users with predictions
        // Convert the map entries to an array for iteration
        const predictionEntries = Array.from(predictions.entries());
        
        for (const [userId, prediction] of predictionEntries) {
          try {
            // Calculate user scores and add to leaderboard
            const calculatedScore = await createMockActor().calculateUserScore(prediction.userId);
            
            if (calculatedScore) {
              console.log(`Adding user ${userId} to leaderboard with score ${calculatedScore.totalScore}`);
              leaderboard.push(calculatedScore);
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
            userId: { toText: () => user.userId } as unknown as Principal,
            prediction: user.prediction,
            submittedAt: user.submittedAt,
            isForSprint: false
          });
        });
      },
    };
  };

  const value: CanisterContextType = {
    actor,
    backendActor,
    f1DataService: null, // Add implementation or keep as null
    predictionService: actor, // Using actor as predictionService temporarily
    aiPredictionService: null, // Add implementation or keep as null
    loading,
    isActorAvailable,
    canisterId: getCanisterId(),
  };

  return (
    <CanisterContext.Provider value={value}>
      {children}
    </CanisterContext.Provider>
  );
}
