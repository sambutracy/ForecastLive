import React, { useState } from 'react';
import { useF1LiveData } from '../contexts/F1LiveDataContext';

// Define interfaces for Race data specific to this component's implementation
interface Circuit {
  name: string;
  location: string;
  country: string;
}

interface SessionData {
  type: string;
  startTime: number;
  endTime: number;
  status: string;
}

interface Race {
  id: string;
  name: string;
  round: number;
  date: string;
  time: string;
  circuit: Circuit;
  status: 'upcoming' | 'live' | 'completed';
  sessions?: SessionData[];
}

interface SessionTimesProps {
  race: Race;
}

interface RaceStatus {
  text: string;
  class: string;
}

const RaceSchedule: React.FC = () => {
  const { raceSchedule, currentRace, isLoading } = useF1LiveData();
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [expandedRace, setExpandedRace] = useState<number | null>(null);

  const formatDate = (dateString: number): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: number): string => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short' 
    });
  };

  const isCurrentRace = (race: Race): boolean => {
    return currentRace !== null && race.round === currentRace.round;
  };

  const isPastRace = (race: Race): boolean => {
    if (!race.sessions) return false;
    const raceSession = race.sessions.find((s: any) => s.type === 'Race');
    if (!raceSession) return false;
    
    const raceDate = new Date(raceSession.startTime);
    const now = new Date();
    return raceDate < now;
  };

  const isUpcomingRace = (race: Race): boolean => {
    if (!race.sessions) return false;
    const raceSession = race.sessions.find((s: any) => s.type === 'Race');
    if (!raceSession) return false;
    
    const raceDate = new Date(raceSession.startTime);
    const now = new Date();
    return raceDate > now;
  };

  const getRaceStatus = (race: Race): RaceStatus => {
    if (isCurrentRace(race)) return { text: 'Current', class: 'bg-orange-100 text-orange-800' };
    if (isPastRace(race)) return { text: 'Completed', class: 'bg-gray-100 text-gray-600' };
    return { text: 'Upcoming', class: 'bg-blue-100 text-blue-800' };
  };

  const handleRaceClick = (race: Race): void => {
    if (expandedRace === race.round) {
      setExpandedRace(null);
    } else {
      setExpandedRace(race.round);
      setSelectedRace(race);
    }
  };

  const handleViewRaceData = async (race: Race): Promise<void> => {
    try {
      // Since loadLiveRaceData doesn't exist in the context, we'll need to modify this
      // For now, just log the intent
      console.log('Loading live race data for:', race.name);
      // Ideally, we'd implement a method in the context to load live race data
    } catch (error) {
      console.error('Failed to load race data:', error);
    }
  };

  const SessionTimes: React.FC<SessionTimesProps> = ({ race }) => {
    if (!race.sessions || race.sessions.length === 0) return null;

    const sessionNames: Record<string, string> = {
      FP1: 'Practice 1',
      FP2: 'Practice 2',
      FP3: 'Practice 3',
      Qualifying: 'Qualifying',
      Sprint: 'Sprint',
      Race: 'Race'
    };

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-3">Session Schedule</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {race.sessions.map((session: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {sessionNames[session.type] || session.type}
              </span>
              <span className="text-sm font-mono text-gray-800">
                {new Date(session.startTime).toLocaleDateString()} {new Date(session.startTime).toLocaleTimeString()}
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
          {raceSchedule.map((race: any) => {
            const status = getRaceStatus(race as Race);
            const isExpanded = expandedRace === race.round;
            const raceSession = race.sessions && race.sessions.find((s: any) => s.type === 'Race');
            
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
                          {race.name}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.class}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <div className="text-gray-600">
                        <div className="flex items-center gap-4 text-sm">
                          <span>📍 {race.circuit.name}</span>
                          <span>🏁 {race.circuit.country}</span>
                          {raceSession && (
                            <>
                              <span>📅 {formatDate(raceSession.startTime)}</span>
                              <span>🕐 {formatTime(raceSession.startTime)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <button 
                        className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        aria-label={isExpanded ? "Collapse race details" : "Expand race details"}
                      >
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
            {currentRace.name} at {currentRace.circuit.name}
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
