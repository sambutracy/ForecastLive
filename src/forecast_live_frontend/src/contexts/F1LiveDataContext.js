import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import appConfig from '../config/appConfig';

const F1LiveDataContext = createContext();

// Handle null service URL gracefully
const F1_DATA_SERVICE_URL = appConfig.api.f1DataService || null;
const F1_SERVICE_ENABLED = !!F1_DATA_SERVICE_URL;

export const useF1LiveData = () => {
  const context = useContext(F1LiveDataContext);
  if (!context) {
    throw new Error('useF1LiveData must be used within a F1LiveDataProvider');
  }
  return context;
};

export const F1LiveDataProvider = ({ children }) => {
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [currentRace, setCurrentRace] = useState(null);
  const [liveRaceData, setLiveRaceData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  // API helper function
  const apiCall = useCallback(async (endpoint, params = {}) => {
    try {
      setError(null);
      
      // If F1 data service is disabled, immediately return mock data
      if (!F1_SERVICE_ENABLED) {
        console.log(`F1 data service is disabled. Using mock data for ${endpoint}`);
        return null; // This will trigger the mock data fallback
      }
      
      // Otherwise try to call the API
      const response = await axios.get(`${F1_DATA_SERVICE_URL}${endpoint}`, { 
        params,
        timeout: 10000 
      });
      return response.data;
    } catch (err) {
      console.error(`API call failed for ${endpoint}:`, err);
      setError(`Failed to fetch data: ${err.message}`);
      
      // Return mock data on API failure
      if (endpoint === '/api/schedule') {
        return { success: true, data: getMockSchedule() };
      } else if (endpoint === '/api/current-race') {
        return { success: true, data: getMockCurrentRace() };
      } else if (endpoint === '/api/live-data') {
        return { success: true, data: getMockLiveData() };
      }
      
      throw err;
    }
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
