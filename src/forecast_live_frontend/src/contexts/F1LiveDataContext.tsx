import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useCanister } from './CanisterContext';
import { io, Socket } from 'socket.io-client';
import appConfig from '../config/appConfig';
import { Race, LiveRaceData, UserPrediction, LeaderboardEntry } from '../types/f1.types';

// Interface for the context
interface F1LiveDataContextType {
  raceSchedule: Race[];
  currentRace: Race | null;
  liveRaceData: LiveRaceData | null;
  upcomingRaces: Race[];
  recentResults: Race[];
  leaderboards: {
    global: LeaderboardEntry[];
    race: Record<string, LeaderboardEntry[]>;
  };
  userPredictions: Record<string, UserPrediction>;
  isLoading: boolean;
  error: string | null;
  fetchRaceSchedule: () => Promise<void>;
  fetchCurrentRace: () => Promise<void>;
  fetchLeaderboards: () => Promise<void>;
  fetchUserPredictions: (userId: string) => Promise<void>;
  submitPrediction: (prediction: UserPrediction) => Promise<boolean>;
  startLiveDataConnection: () => void;
  stopLiveDataConnection: () => void;
}

// Create the context
const F1LiveDataContext = createContext<F1LiveDataContextType | null>(null);

// Custom hook for accessing the context
export const useF1LiveData = (): F1LiveDataContextType => {
  const context = useContext(F1LiveDataContext);
  if (!context) {
    throw new Error('useF1LiveData must be used within a F1LiveDataProvider');
  }
  return context;
};

// Provider component props
interface F1LiveDataProviderProps {
  children: ReactNode;
}

// Provider component
export const F1LiveDataProvider: React.FC<F1LiveDataProviderProps> = ({ children }) => {
  const { f1DataService, predictionService } = useCanister();
  
  // State variables
  const [raceSchedule, setRaceSchedule] = useState<Race[]>([]);
  const [currentRace, setCurrentRace] = useState<Race | null>(null);
  const [liveRaceData, setLiveRaceData] = useState<LiveRaceData | null>(null);
  const [leaderboards, setLeaderboards] = useState<{
    global: LeaderboardEntry[];
    race: Record<string, LeaderboardEntry[]>;
  }>({ global: [], race: {} });
  const [userPredictions, setUserPredictions] = useState<Record<string, UserPrediction>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Computed properties
  const upcomingRaces = raceSchedule.filter(race => race.status === 'upcoming').slice(0, 5);
  const recentResults = raceSchedule.filter(race => race.status === 'completed').slice(0, 5);

  // Fetch race schedule
  const fetchRaceSchedule = useCallback(async (): Promise<void> => {
    if (!f1DataService) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const schedule = await f1DataService.getRaceSchedule();
      setRaceSchedule(schedule);
    } catch (err) {
      console.error('Error fetching race schedule:', err);
      setError('Failed to fetch race schedule');
    } finally {
      setIsLoading(false);
    }
  }, [f1DataService]);

  // Fetch current race
  const fetchCurrentRace = useCallback(async (): Promise<void> => {
    if (!f1DataService) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const race = await f1DataService.getCurrentRace();
      setCurrentRace(race);
    } catch (err) {
      console.error('Error fetching current race:', err);
      setError('Failed to fetch current race');
    } finally {
      setIsLoading(false);
    }
  }, [f1DataService]);

  // Fetch leaderboards
  const fetchLeaderboards = useCallback(async (): Promise<void> => {
    if (!predictionService) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await predictionService.getLeaderboards();
      setLeaderboards(data);
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setError('Failed to fetch leaderboards');
    } finally {
      setIsLoading(false);
    }
  }, [predictionService]);

  // Fetch user predictions
  const fetchUserPredictions = useCallback(async (userId: string): Promise<void> => {
    if (!predictionService) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const predictions = await predictionService.getUserPredictions(userId);
      setUserPredictions(predictions);
    } catch (err) {
      console.error('Error fetching user predictions:', err);
      setError('Failed to fetch user predictions');
    } finally {
      setIsLoading(false);
    }
  }, [predictionService]);

  // Submit a prediction
  const submitPrediction = useCallback(async (prediction: UserPrediction): Promise<boolean> => {
    if (!predictionService) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await predictionService.submitPrediction(prediction);
      
      if (result.success) {
        setUserPredictions(prev => ({
          ...prev,
          [prediction.raceId]: prediction
        }));
        return true;
      } else {
        setError(result.error || 'Failed to submit prediction');
        return false;
      }
    } catch (err: any) {
      console.error('Error submitting prediction:', err);
      setError(err.message || 'An error occurred while submitting your prediction');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [predictionService]);

  // Start live data connection
  const startLiveDataConnection = useCallback((): void => {
    if (socket) return;
    
    const newSocket = io(appConfig.F1_DATA_SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to F1 live data service');
    });
    
    newSocket.on('liveRaceData', (data: LiveRaceData) => {
      setLiveRaceData(data);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from F1 live data service');
    });
    
    newSocket.on('error', (err: any) => {
      console.error('Socket error:', err);
      setError('Connection to live data service failed');
    });
    
    setSocket(newSocket);
  }, [socket]);

  // Stop live data connection
  const stopLiveDataConnection = useCallback((): void => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setLiveRaceData(null);
    }
  }, [socket]);

  // Load initial data
  useEffect(() => {
    if (f1DataService && predictionService) {
      fetchRaceSchedule();
      fetchCurrentRace();
      fetchLeaderboards();
    }
    
    return () => {
      stopLiveDataConnection();
    };
  }, [f1DataService, predictionService, fetchRaceSchedule, fetchCurrentRace, fetchLeaderboards, stopLiveDataConnection]);

  // Connect to live data when current race is active
  useEffect(() => {
    if (currentRace && currentRace.status === 'live') {
      startLiveDataConnection();
    } else {
      stopLiveDataConnection();
    }
  }, [currentRace, startLiveDataConnection, stopLiveDataConnection]);

  // Context value
  const contextValue: F1LiveDataContextType = {
    raceSchedule,
    currentRace,
    liveRaceData,
    upcomingRaces,
    recentResults,
    leaderboards,
    userPredictions,
    isLoading,
    error,
    fetchRaceSchedule,
    fetchCurrentRace,
    fetchLeaderboards,
    fetchUserPredictions,
    submitPrediction,
    startLiveDataConnection,
    stopLiveDataConnection
  };

  return (
    <F1LiveDataContext.Provider value={contextValue}>
      {children}
    </F1LiveDataContext.Provider>
  );
};
