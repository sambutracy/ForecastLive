import React, { useState, useEffect } from 'react';
import { useF1LiveData } from '../contexts/F1LiveDataContext';

const LiveRaceTracker = () => {
  const {
    currentRace,
    liveRaceData,
    isConnected,
    isLoading,
    error,
    loadLiveRaceData,
    connectToLiveUpdates,
    disconnectFromLiveUpdates
  } = useF1LiveData();

  const [selectedSession, setSelectedSession] = useState('Race');
  const [autoUpdate, setAutoUpdate] = useState(true);

  // Handle session change
  const handleSessionChange = async (sessionType) => {
    setSelectedSession(sessionType);
    if (currentRace) {
      await loadLiveRaceData(new Date().getFullYear(), currentRace.raceName, sessionType);
    }
  };

  // Toggle auto updates
  const toggleAutoUpdate = () => {
    if (autoUpdate) {
      disconnectFromLiveUpdates();
    } else {
      connectToLiveUpdates();
    }
    setAutoUpdate(!autoUpdate);
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
        {isConnected ? 'Live' : 'Offline'}
      </span>
      {liveRaceData?.timestamp && (
        <span className="text-gray-500 ml-2">
          Updated: {new Date(liveRaceData.timestamp).toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // Session selector
  const SessionSelector = () => (
    <div className="flex gap-2 mb-4">
      {['Practice1', 'Practice2', 'Practice3', 'Qualifying', 'Race'].map((session) => (
        <button
          key={session}
          onClick={() => handleSessionChange(session)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            selectedSession === session
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-orange-100'
          }`}
        >
          {session}
        </button>
      ))}
    </div>
  );

  // Race progress indicator
  const RaceProgress = () => {
    if (!liveRaceData || liveRaceData.sessionType !== 'Race') return null;

    const progressPercentage = liveRaceData.totalLaps > 0 
      ? (liveRaceData.currentLap / liveRaceData.totalLaps) * 100 
      : 0;

    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-700">Race Progress</span>
          <span className="text-sm text-gray-600">
            Lap {liveRaceData.currentLap} of {liveRaceData.totalLaps}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Driver position card
  const DriverCard = ({ driver, index }) => {
    const getPositionColor = (position) => {
      if (position === 1) return 'bg-yellow-400';
      if (position === 2) return 'bg-gray-300';
      if (position === 3) return 'bg-orange-400';
      if (position <= 10) return 'bg-green-100';
      return 'bg-gray-100';
    };

    const getPositionTextColor = (position) => {
      if (position <= 3) return 'text-white font-bold';
      return 'text-gray-800';
    };

    return (
      <div 
        key={driver.driverCode}
        className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getPositionColor(driver.position)} ${getPositionTextColor(driver.position)}`}>
          {driver.position}
        </div>
        
        <div className="flex-1 ml-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900">{driver.driverName}</div>
              <div className="text-sm text-gray-600">{driver.team}</div>
            </div>
            
            <div className="text-right">
              {driver.time && (
                <div className="text-sm font-mono text-gray-800">{driver.time}</div>
              )}
              {driver.points > 0 && (
                <div className="text-xs text-orange-600 font-medium">
                  {driver.points} pts
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ml-3 text-right">
          <div className="text-xs text-gray-500">{driver.driverCode}</div>
          <div className={`text-xs font-medium ${
            driver.status === 'Running' ? 'text-green-600' : 
            driver.status === 'Finished' ? 'text-blue-600' : 'text-red-600'
          }`}>
            {driver.status}
          </div>
        </div>
      </div>
    );
  };

  if (!currentRace) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Live Race Tracker</h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No active race weekend</div>
          <div className="text-sm text-gray-400">Live tracking will be available during race weekends</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{currentRace.raceName}</h2>
          <p className="text-gray-600">{currentRace.circuitName}, {currentRace.country}</p>
        </div>
        
        <div className="text-right">
          <ConnectionStatus />
          <button
            onClick={toggleAutoUpdate}
            className={`mt-2 px-3 py-1 rounded text-sm font-medium ${
              autoUpdate 
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoUpdate ? 'Auto Update ON' : 'Auto Update OFF'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 text-sm">{error}</div>
          <div className="text-red-600 text-xs mt-1">Using fallback data</div>
        </div>
      )}

      <SessionSelector />

      {liveRaceData && (
        <>
          <div className="mb-4 p-3 bg-orange-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-orange-800">{liveRaceData.sessionType}</span>
                <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                  liveRaceData.sessionStatus === 'Live' ? 'bg-red-100 text-red-800' :
                  liveRaceData.sessionStatus === 'Finished' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {liveRaceData.sessionStatus}
                </span>
              </div>
              
              {isLoading && (
                <div className="text-orange-600 text-sm">Loading...</div>
              )}
            </div>
          </div>

          <RaceProgress />

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Current Positions
            </h3>
            
            {liveRaceData.results && liveRaceData.results.length > 0 ? (
              liveRaceData.results
                .sort((a, b) => (a.position || 999) - (b.position || 999))
                .map((driver, index) => (
                  <DriverCard key={driver.driverCode} driver={driver} index={index} />
                ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No position data available
              </div>
            )}
          </div>
        </>
      )}

      {!liveRaceData && !isLoading && (
        <div className="text-center py-8">
          <button
            onClick={() => loadLiveRaceData(new Date().getFullYear(), currentRace.raceName, selectedSession)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Load Session Data
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveRaceTracker;
