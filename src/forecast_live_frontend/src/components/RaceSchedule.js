import React, { useState } from 'react';
import { useF1LiveData } from '../contexts/F1LiveDataContext';

const RaceSchedule = () => {
  const { raceSchedule, currentRace, isLoading, loadLiveRaceData } = useF1LiveData();
  const [selectedRace, setSelectedRace] = useState(null);
  const [expandedRace, setExpandedRace] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short' 
    });
  };

  const isCurrentRace = (race) => {
    return currentRace && race.round === currentRace.round;
  };

  const isPastRace = (race) => {
    const raceDate = new Date(race.date);
    const now = new Date();
    return raceDate < now;
  };

  const isUpcomingRace = (race) => {
    const raceDate = new Date(race.date);
    const now = new Date();
    return raceDate > now;
  };

  const getRaceStatus = (race) => {
    if (isCurrentRace(race)) return { text: 'Current', class: 'bg-orange-100 text-orange-800' };
    if (isPastRace(race)) return { text: 'Completed', class: 'bg-gray-100 text-gray-600' };
    return { text: 'Upcoming', class: 'bg-blue-100 text-blue-800' };
  };

  const handleRaceClick = (race) => {
    if (expandedRace === race.round) {
      setExpandedRace(null);
    } else {
      setExpandedRace(race.round);
      setSelectedRace(race);
    }
  };

  const handleViewRaceData = async (race) => {
    try {
      await loadLiveRaceData(new Date().getFullYear(), race.raceName, 'Race');
    } catch (error) {
      console.error('Failed to load race data:', error);
    }
  };

  const SessionTimes = ({ race }) => {
    if (!race.sessions) return null;

    const sessionNames = {
      practice1: 'Practice 1',
      practice2: 'Practice 2',
      practice3: 'Practice 3',
      qualifying: 'Qualifying',
      race: 'Race'
    };

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">Session Schedule</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(race.sessions).map(([sessionKey, sessionTime]) => (
            <div key={sessionKey} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {sessionNames[sessionKey] || sessionKey}
              </span>
              <span className="text-sm font-mono text-gray-800">
                {new Date(sessionTime).toLocaleDateString()} {new Date(sessionTime).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleViewRaceData(race)}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
          >
            View Race Data
          </button>
          {isPastRace(race) && (
            <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors">
              View Results
            </button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Race Schedule</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">2024 F1 Race Schedule</h2>
        <div className="text-sm text-gray-600">
          {raceSchedule.length} races
        </div>
      </div>

      {raceSchedule.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No race schedule available
        </div>
      ) : (
        <div className="space-y-3">
          {raceSchedule.map((race) => {
            const status = getRaceStatus(race);
            const isExpanded = expandedRace === race.round;
            
            return (
              <div 
                key={race.round}
                className={`border rounded-lg transition-all duration-200 ${
                  isCurrentRace(race) 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } ${isExpanded ? 'shadow-md' : 'shadow-sm'}`}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => handleRaceClick(race)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-gray-600">
                          R{race.round}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {race.raceName}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.class}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <div className="text-gray-600">
                        <div className="flex items-center gap-4 text-sm">
                          <span>📍 {race.circuitName}</span>
                          <span>🏁 {race.country}</span>
                          <span>📅 {formatDate(race.date)}</span>
                          {race.time && <span>🕐 {formatTime(race.time)}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {isExpanded && <SessionTimes race={race} />}
              </div>
            );
          })}
        </div>
      )}
      
      {currentRace && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-orange-800">Current Race Weekend</span>
          </div>
          <div className="text-orange-700">
            {currentRace.raceName} at {currentRace.circuitName}
          </div>
          <div className="text-sm text-orange-600 mt-1">
            Live data and predictions are active for this event
          </div>
        </div>
      )}
    </div>
  );
};

export default RaceSchedule;
