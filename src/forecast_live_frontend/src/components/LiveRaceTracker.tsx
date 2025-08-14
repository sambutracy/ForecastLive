import React, { useState, useEffect } from 'react';
import { useF1LiveData } from '../contexts/F1LiveDataContext';
import { LiveRaceData, LiveDriverData, Driver, Team } from '../types/f1.types';

interface DriverDisplay extends LiveDriverData {
  driver?: Driver;
  team?: Team;
}

// Adding a type assertion to fix the weather type issues
const convertWeather = (liveRaceData: LiveRaceData) => {
  if (!liveRaceData.weather) return undefined;
  
  // Convert from LiveRaceData weather format to our component format
  return {
    trackTemp: (liveRaceData.weather as any).trackTemperature || 0,
    airTemp: (liveRaceData.weather as any).temperature || 0,
    humidity: 0, // Default value since it might not be in the incoming data
    windSpeed: (liveRaceData.weather as any).windSpeed || 0,
    windDirection: 0, // Default value since it might not be in the incoming data
    precipitation: (liveRaceData.weather as any).precipitation || 0
  };
};

const LiveRaceTracker: React.FC = () => {
  const { liveRaceData, currentRace, startLiveDataConnection, stopLiveDataConnection } = useF1LiveData();
  const [drivers, setDrivers] = useState<DriverDisplay[]>([]);
  const [sessionInfo, setSessionInfo] = useState<string>('No active session');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [weather, setWeather] = useState<LiveRaceData['weather'] | undefined>(undefined);
  
  // Format time from milliseconds to MM:SS.sss format
  const formatTime = (time: number | undefined): string => {
    if (!time) return '--';
    
    const minutes = Math.floor(time / 60000);
    const seconds = ((time % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };
  
  // Format gap time
  const formatGap = (gap: string): string => {
    return gap;
  };
  
  // Format elapsed time
  const formatElapsedTime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };
  
    // Handle live data updates
  useEffect(() => {
    if (liveRaceData) {
      // Update drivers data
      const driversData = (liveRaceData as any).driverData?.map((driver: LiveDriverData) => {
        // Get the driver and team info from currentRace if available
        const driverInfo = (currentRace as any)?.drivers?.find((d: any) => d.id === driver.driverId);
        const teamInfo = driverInfo ? (currentRace as any)?.teams?.find((t: any) => t.id === driverInfo.team) : undefined;
        
        return {
          ...driver,
          driver: driverInfo,
          team: teamInfo
        };
      }) || [];
      setDrivers(driversData);
      
      // Update session info
      setSessionInfo(
        `${currentRace?.name || 'Unknown Race'} - ${(liveRaceData as any).sessionType || 'Unknown Session'} - ${liveRaceData.sessionStatus}`
      );
      
      // Update last update time
      setLastUpdate(new Date(liveRaceData.timestamp).toLocaleTimeString());
      
      // Update weather with type conversion
      setWeather(convertWeather(liveRaceData));
      
      // Set live status
      setIsLive(true);
    } else {
      setIsLive(false);
    }
  }, [liveRaceData, currentRace]);
  
  // Start/stop live data connection based on current race status
  useEffect(() => {
    if (currentRace?.status === 'live') {
      startLiveDataConnection();
    } else {
      stopLiveDataConnection();
    }
    
    return () => {
      stopLiveDataConnection();
    };
  }, [currentRace, startLiveDataConnection, stopLiveDataConnection]);
  
  // If no live race, show a message
  if (!isLive) {
    return (
      <div className="live-race-container p-6 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Live Race Tracker</h2>
          <div className="status-indicator bg-gray-500 text-white px-3 py-1 rounded-full text-sm">
            Offline
          </div>
        </div>
        
        <div className="race-status text-center py-10">
          <p className="text-lg text-gray-400">No live race session at the moment</p>
          <p className="text-sm text-gray-500 mt-2">
            {currentRace ? 
              `Next race: ${currentRace.name}` : 
              'Check the race schedule for upcoming events'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="live-race-container p-4 bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{sessionInfo}</h2>
        <div className="flex items-center">
          <div className="status-indicator bg-green-500 text-white px-3 py-1 rounded-full text-sm mr-2">
            Live
          </div>
          <div className="text-xs text-gray-400">
            Last update: {lastUpdate}
          </div>
        </div>
      </div>
      
      {/* Race Information */}
      <div className="race-info grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Time Elapsed</div>
          <div className="text-lg font-mono font-bold">
            {liveRaceData ? formatElapsedTime((liveRaceData as any).timeElapsed || 0) : '--'}
          </div>
        </div>
        
        {(liveRaceData as any)?.remainingTime && (
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400">Time Remaining</div>
            <div className="text-lg font-mono font-bold">
              {formatElapsedTime((liveRaceData as any).remainingTime)}
            </div>
          </div>
        )}
        
        {weather && (
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400">Track Conditions</div>
            <div className="text-lg">
              <span className="font-bold">{weather.trackTemp}°C</span> 
              <span className="text-sm text-gray-400 ml-1">Track</span>
              <span className="mx-2">|</span>
              <span className="font-bold">{weather.airTemp}°C</span>
              <span className="text-sm text-gray-400 ml-1">Air</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Driver Table */}
      <div className="driver-table-container overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase bg-gray-700">
            <tr>
              <th className="px-4 py-2">Pos</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Team</th>
              <th className="px-4 py-2">Lap</th>
              <th className="px-4 py-2">Last Lap</th>
              <th className="px-4 py-2">Gap</th>
              <th className="px-4 py-2">S1</th>
              <th className="px-4 py-2">S2</th>
              <th className="px-4 py-2">S3</th>
              <th className="px-4 py-2">Pits</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.driverId} className="border-b border-gray-700 hover:bg-gray-600">
                <td className="px-4 py-2">{driver.position}</td>
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  {driver.driver?.code || driver.driverId}
                </td>
                <td className="px-4 py-2">{driver.team?.name || 'Unknown'}</td>
                <td className="px-4 py-2">{driver.lapNumber}</td>
                <td className="px-4 py-2 font-mono">
                  {formatTime(driver.lastLapTime)}
                </td>
                <td className="px-4 py-2">{formatGap(driver.gap)}</td>
                <td className="px-4 py-2 font-mono">
                  {formatTime(driver.sector1Time)}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatTime(driver.sector2Time)}
                </td>
                <td className="px-4 py-2 font-mono">
                  {formatTime(driver.sector3Time)}
                </td>
                <td className="px-4 py-2">{driver.pitStops}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Session Status */}
      {liveRaceData?.sessionStatus === 'safetycar' && (
        <div className="session-alert bg-yellow-500 text-black font-bold p-2 text-center mt-4 rounded">
          SAFETY CAR DEPLOYED
        </div>
      )}
      
      {liveRaceData?.sessionStatus === 'virtualsc' && (
        <div className="session-alert bg-yellow-300 text-black font-bold p-2 text-center mt-4 rounded">
          VIRTUAL SAFETY CAR
        </div>
      )}
      
      {/* Using type assertion to allow 'red' */}
      {(liveRaceData?.sessionStatus as string) === 'red' && (
        <div className="session-alert bg-red-600 text-white font-bold p-2 text-center mt-4 rounded">
          RED FLAG
        </div>
      )}
    </div>
  );
};

export default LiveRaceTracker;
