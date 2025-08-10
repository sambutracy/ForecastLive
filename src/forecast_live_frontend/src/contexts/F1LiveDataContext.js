import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCanister } from './CanisterContext';

const F1LiveDataContext = createContext();

export const useF1LiveData = () => {
  const context = useContext(F1LiveDataContext);
  if (!context) {
    throw new Error('useF1LiveData must be used within a F1LiveDataProvider');
  }
  return context;
};

export const F1LiveDataProvider = ({ children }) => {
  const { f1DataService, predictionService } = useCanister();
  
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [currentRace, setCurrentRace] = useState(null);
  const [liveRaceData, setLiveRaceData] = useState(null);
  const [leaderboards, setLeaderboards] = useState({});
  const [userPredictions, setUserPredictions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Fetch race schedule from the F1DataService canister
  const fetchRaceSchedule = useCallback(async () => {
    if (!f1DataService) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await f1DataService.getAllRaces();
      if (result && Array.isArray(result)) {
        setRaceSchedule(result);
        
        // Set current race if one is running
        const runningRace = result.find(race => race.status.hasOwnProperty('running'));
        if (runningRace) {
          setCurrentRace(runningRace);
        } else {
          // Otherwise, find the next upcoming race
          const now = Date.now();
          const nextRace = result
            .filter(race => race.startTime > now)
            .sort((a, b) => a.startTime - b.startTime)[0];
          
          if (nextRace) {
            setCurrentRace(nextRace);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch race schedule:', err);
      setError('Failed to fetch race schedule');
    } finally {
      setIsLoading(false);
    }
  }, [f1DataService]);

  // Fetch live race data for the current race
  const fetchLiveRaceData = useCallback(async (raceId) => {
    if (!f1DataService || !raceId) return;
    
    try {
      setIsLoading(true);
      
      const result = await f1DataService.getRace(raceId);
      if (result) {
        setLiveRaceData(result);
      }
    } catch (err) {
      console.error(`Failed to fetch live data for race ${raceId}:`, err);
      // Don't set error here to avoid UI disruption during polling
    } finally {
      setIsLoading(false);
    }
  }, [f1DataService]);

  // Start a race simulation (for testing)
  const startRaceSimulation = useCallback(async (raceId) => {
    if (!f1DataService || !raceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await f1DataService.startRaceSimulation(raceId);
      
      if (result.ok) {
        // Start polling for updates
        startPolling(raceId);
        
        // Refresh race data immediately
        await fetchLiveRaceData(raceId);
      } else {
        setError(result.err || 'Failed to start race simulation');
      }
    } catch (err) {
      console.error('Failed to start race simulation:', err);
      setError('Failed to start race simulation');
    } finally {
      setIsLoading(false);
    }
  }, [f1DataService, fetchLiveRaceData]);

  // Start polling for race updates
  const startPolling = useCallback((raceId) => {
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchLiveRaceData(raceId);
    }, 10000);
    
    setPollingInterval(interval);
    
    return () => {
      clearInterval(interval);
      setPollingInterval(null);
    };
  }, [fetchLiveRaceData, pollingInterval]);

  // Stop polling for race updates
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Get leaderboard for a specific group and race
  const fetchLeaderboard = useCallback(async (groupId, raceId) => {
    if (!predictionService || !groupId || !raceId) return;
    
    try {
      const result = await predictionService.getLeaderboard(groupId, raceId);
      
      if (result && Array.isArray(result)) {
        setLeaderboards(prev => ({
          ...prev,
          [`${groupId}-${raceId}`]: result
        }));
        
        return result;
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      return [];
    }
  }, [predictionService]);

  // Get user predictions for a race
  const fetchUserPredictions = useCallback(async (principal, raceId) => {
    if (!predictionService || !principal || !raceId) return;
    
    try {
      const result = await predictionService.getUserPredictionsForRace(principal, raceId);
      
      if (result && Array.isArray(result)) {
        setUserPredictions(prev => ({
          ...prev,
          [raceId]: result
        }));
        
        return result;
      }
    } catch (err) {
      console.error('Failed to fetch user predictions:', err);
      return [];
    }
  }, [predictionService]);

  // Submit a user prediction
  const submitPrediction = useCallback(async (raceId, weekendType, screenshotRef) => {
    if (!predictionService || !raceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Current time + 1 hour for testing (in production would be race start time)
      const deadlineTimestamp = Date.now() + 3600000;
      
      const result = await predictionService.storePrediction(
        raceId,
        weekendType,
        deadlineTimestamp,
        screenshotRef
      );
      
      if (result.ok) {
        return result.ok;
      } else {
        setError(result.err || 'Failed to submit prediction');
        return null;
      }
    } catch (err) {
      console.error('Failed to submit prediction:', err);
      setError('Failed to submit prediction');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [predictionService]);

  // Confirm a prediction after parsing
  const confirmPrediction = useCallback(async (predictionId) => {
    if (!predictionService || !predictionId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await predictionService.confirmPrediction(predictionId);
      
      if (result.ok) {
        return true;
      } else {
        setError(result.err || 'Failed to confirm prediction');
        return false;
      }
    } catch (err) {
      console.error('Failed to confirm prediction:', err);
      setError('Failed to confirm prediction');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [predictionService]);

  // Join a group's leaderboard for a race
  const joinLeaderboard = useCallback(async (groupId, raceId) => {
    if (!predictionService || !groupId || !raceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await predictionService.joinGroupForRace(groupId, raceId);
      
      if (result.ok) {
        // Refresh the leaderboard
        await fetchLeaderboard(groupId, raceId);
        return result.ok;
      } else {
        setError(result.err || 'Failed to join leaderboard');
        return null;
      }
    } catch (err) {
      console.error('Failed to join leaderboard:', err);
      setError('Failed to join leaderboard');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [predictionService, fetchLeaderboard]);

  // Format a timestamp for display
  const formatRaceTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Initialize data on mount
  useEffect(() => {
    if (f1DataService) {
      fetchRaceSchedule();
    }
    
    // Cleanup polling on unmount
    return () => {
      stopPolling();
    };
  }, [f1DataService, fetchRaceSchedule, stopPolling]);

  // Update current race if race schedule changes
  useEffect(() => {
    if (currentRace && currentRace.status.hasOwnProperty('running')) {
      fetchLiveRaceData(currentRace.raceId);
      startPolling(currentRace.raceId);
    }
  }, [currentRace, fetchLiveRaceData, startPolling]);

  const value = {
    raceSchedule,
    currentRace,
    liveRaceData,
    leaderboards,
    userPredictions,
    isLoading,
    error,
    fetchRaceSchedule,
    fetchLiveRaceData,
    startRaceSimulation,
    fetchLeaderboard,
    fetchUserPredictions,
    submitPrediction,
    confirmPrediction,
    joinLeaderboard,
    formatRaceTime,
    stopPolling
  };

  return (
    <F1LiveDataContext.Provider value={value}>
      {children}
    </F1LiveDataContext.Provider>
  );
};

export default F1LiveDataContext;

export const F1DataProvider = ({ children }) => {
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [currentRace, setCurrentRace] = useState(null);
  const [liveRaceData, setLiveRaceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const apiCall = useCallback(async (endpoint, params = {}) => {
    // API call implementation
    return { success: true, data: {} };
  }, []);

  // Load race schedule
  const loadRaceSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiCall('/api/schedule');
      if (response.success) {
        setRaceSchedule(response.data);
      }
    } catch (err) {
      console.error('Failed to load race schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Load current race weekend
  const loadCurrentRace = useCallback(async () => {
    try {
      const response = await apiCall('/api/current-race');
      if (response.success) {
        setCurrentRace(response.data);
      }
    } catch (err) {
      console.error('Failed to load current race:', err);
    }
  }, [apiCall]);

  // Load live race data
  const loadLiveRaceData = useCallback(async (year, gp, session = 'Race') => {
    try {
      setIsLoading(true);
      const response = await apiCall('/api/live-data', { year, gp, session });
      if (response.success) {
        setLiveRaceData(response.data);
      }
      return response.data;
    } catch (err) {
      console.error('Failed to load live race data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // Get session results
  const getSessionResults = useCallback(async (year, gpName, sessionType) => {
    try {
      const response = await apiCall(`/api/session-results/${year}/${gpName}/${sessionType}`);
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Failed to get session results:', err);
      return null;
    }
  }, [apiCall]);

  // WebSocket connection
  const connectToLiveUpdates = useCallback(() => {
    try {
      // Skip WebSocket connection if F1 data service is disabled
      if (!F1_SERVICE_ENABLED) {
        console.log('F1 data service is disabled. WebSocket connection skipped.');
        setIsConnected(false);
        return;
      }
      
      const newSocket = io(F1_DATA_SERVICE_URL, {
        timeout: 5000,
        forceNew: true
      });

      newSocket.on('connect', () => {
        console.log('Connected to F1 Live Data Service');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to live timing updates
        newSocket.emit('subscribe_live_timing', { 
          timestamp: new Date().toISOString() 
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from F1 Live Data Service');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
        setError('Failed to connect to live data service');
      });

      newSocket.on('live_timing_update', (data) => {
        console.log('Received live timing update:', data);
        setLiveRaceData(data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setError('Live updates unavailable');
    }
  }, []);

  // Disconnect from live updates
  const disconnectFromLiveUpdates = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Mock data functions for fallback
  const getMockSchedule = () => [
    {
      round: 1,
      raceName: 'Bahrain Grand Prix',
      circuitName: 'Bahrain International Circuit',
      country: 'Bahrain',
      date: '2024-03-02',
      time: '15:00:00',
      sessions: {
        practice1: '2024-03-01 11:30:00',
        practice2: '2024-03-01 15:00:00',
        practice3: '2024-03-02 11:30:00',
        qualifying: '2024-03-02 15:00:00',
        race: '2024-03-03 15:00:00'
      }
    },
    {
      round: 2,
      raceName: 'Saudi Arabian Grand Prix',
      circuitName: 'Jeddah Corniche Circuit',
      country: 'Saudi Arabia',
      date: '2024-03-09',
      time: '18:00:00',
      sessions: {
        practice1: '2024-03-08 13:30:00',
        practice2: '2024-03-08 17:00:00',
        practice3: '2024-03-09 13:30:00',
        qualifying: '2024-03-09 17:00:00',
        race: '2024-03-09 18:00:00'
      }
    }
  ];

  const getMockCurrentRace = () => ({
    round: 1,
    raceName: 'Bahrain Grand Prix',
    circuitName: 'Bahrain International Circuit',
    country: 'Bahrain',
    date: '2024-03-02',
    time: '15:00:00',
    sessions: {
      practice1: '2024-03-01 11:30:00',
      practice2: '2024-03-01 15:00:00',
      practice3: '2024-03-02 11:30:00',
      qualifying: '2024-03-02 15:00:00',
      race: '2024-03-03 15:00:00'
    }
  });

  const getMockLiveData = () => ({
    sessionType: 'Race',
    sessionStatus: 'Live',
    totalLaps: 57,
    currentLap: 42,
    results: [
      { position: 1, driverCode: 'VER', driverName: 'Max Verstappen', team: 'Red Bull Racing', time: '1:25.123', status: 'Running', points: 25 },
      { position: 2, driverCode: 'HAM', driverName: 'Lewis Hamilton', team: 'Mercedes', time: '1:25.456', status: 'Running', points: 18 },
      { position: 3, driverCode: 'LEC', driverName: 'Charles Leclerc', team: 'Ferrari', time: '1:25.789', status: 'Running', points: 15 },
      { position: 4, driverCode: 'RUS', driverName: 'George Russell', team: 'Mercedes', time: '1:26.012', status: 'Running', points: 12 },
      { position: 5, driverCode: 'SAI', driverName: 'Carlos Sainz', team: 'Ferrari', time: '1:26.234', status: 'Running', points: 10 }
    ],
    liveTimingData: [],
    timestamp: new Date().toISOString()
  });

  // Initialize data on mount
  useEffect(() => {
    loadRaceSchedule();
    loadCurrentRace();
  }, [loadRaceSchedule, loadCurrentRace]);

  // Auto-connect to live updates if there's a current race
  useEffect(() => {
    if (currentRace && !socket) {
      connectToLiveUpdates();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentRace, socket, connectToLiveUpdates]);

  const value = {
    // Data
    raceSchedule,
    currentRace,
    liveRaceData,
    
    // State
    isConnected,
    isLoading,
    error,
    
    // Actions
    loadRaceSchedule,
    loadCurrentRace,
    loadLiveRaceData,
    getSessionResults,
    connectToLiveUpdates,
    disconnectFromLiveUpdates,
    
    // Utility
    isLiveDataService: () => F1_DATA_SERVICE_URL !== null
  };

  return (
    <F1LiveDataContext.Provider value={value}>
      {children}
    </F1LiveDataContext.Provider>
  );
};
