import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { useCanister } from '../contexts/CanisterContext';
import { useF1LiveData } from '../contexts/F1LiveDataContext';
import { AuthType } from '../types/auth.types';
import { Race as F1Race } from '../types/f1.types';
import { Actor } from '@dfinity/agent';
import RaceStatus from './RaceStatus';
import Leaderboard, { LeaderboardUser } from './Leaderboard';
import SimplePredictionUpload from './SimplePredictionUpload';
import PredictionComparison, { PredictionDriver } from './PredictionComparison';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RaceData {
  name: string;
  circuit: string;
  predictions?: any[];
}

interface UserStats {
  totalPredictions: number;
  accuracy: number;
  rank: number;
  points: number;
}

// Mock data for new components
const MOCK_LEADERBOARD_DATA: LeaderboardUser[] = [
  { userId: 'user1', username: 'Tracy', points: 230, movement: 0 },
  { userId: 'user2', username: 'Victor', points: 210, movement: 0 },
  { userId: 'user3', username: 'Joy', points: 190, movement: 0 },
  { userId: 'user4', username: 'Ian', points: 175, movement: 0 },
  { userId: 'user5', username: 'Peter', points: 160, movement: 0 },
];

// Mock predictions for each user
const MOCK_USER_PREDICTIONS: Record<string, Array<{ driverId: string; predictedPosition: number }>> = {
  'user1': [
    { driverId: 'VER', predictedPosition: 1 },
    { driverId: 'HAM', predictedPosition: 3 },
    { driverId: 'LEC', predictedPosition: 2 },
    { driverId: 'NOR', predictedPosition: 4 },
    { driverId: 'SAI', predictedPosition: 5 },
  ],
  'user2': [
    { driverId: 'VER', predictedPosition: 2 },
    { driverId: 'HAM', predictedPosition: 1 },
    { driverId: 'LEC', predictedPosition: 3 },
    { driverId: 'NOR', predictedPosition: 5 },
    { driverId: 'SAI', predictedPosition: 4 },
  ],
  'user3': [
    { driverId: 'VER', predictedPosition: 1 },
    { driverId: 'HAM', predictedPosition: 2 },
    { driverId: 'LEC', predictedPosition: 4 },
    { driverId: 'NOR', predictedPosition: 3 },
    { driverId: 'SAI', predictedPosition: 5 },
  ],
  'user4': [
    { driverId: 'VER', predictedPosition: 3 },
    { driverId: 'HAM', predictedPosition: 1 },
    { driverId: 'LEC', predictedPosition: 2 },
    { driverId: 'NOR', predictedPosition: 5 },
    { driverId: 'SAI', predictedPosition: 4 },
  ],
  'user5': [
    { driverId: 'VER', predictedPosition: 2 },
    { driverId: 'HAM', predictedPosition: 3 },
    { driverId: 'LEC', predictedPosition: 1 },
    { driverId: 'NOR', predictedPosition: 4 },
    { driverId: 'SAI', predictedPosition: 5 },
  ],
};

const MOCK_PREDICTION_DATA: PredictionDriver[] = [
  { driverName: 'Max Verstappen', predictedPosition: 1, actualPosition: 1 },
  { driverName: 'Lewis Hamilton', predictedPosition: 2, actualPosition: 3 },
  { driverName: 'Charles Leclerc', predictedPosition: 3, actualPosition: 2 },
  { driverName: 'Lando Norris', predictedPosition: 4, actualPosition: 4 },
  { driverName: 'Carlos Sainz', predictedPosition: 5, actualPosition: 7 },
  { driverName: 'Sergio Perez', predictedPosition: 6, actualPosition: 5 },
  { driverName: 'George Russell', predictedPosition: 7, actualPosition: 6 },
  { driverName: 'Fernando Alonso', predictedPosition: 8, actualPosition: 8 },
  { driverName: 'Oscar Piastri', predictedPosition: 9, actualPosition: 10 },
  { driverName: 'Pierre Gasly', predictedPosition: 10, actualPosition: 9 },
];

const Dashboard: React.FC = () => {
  const { user, authType, isAuthenticated } = useAuth();
  const { actor, isActorAvailable } = useCanister();
  const { liveRaceData, upcomingRaces, recentResults } = useF1LiveData();
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalPredictions: 0,
    accuracy: 0,
    rank: 0,
    points: 0
  });
  
  // State for lap-by-lap chart data
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: []
  });
  
  // Mock race status data
  const [raceStatus, setRaceStatus] = useState({
    raceName: 'Monaco Grand Prix',
    currentLap: 45,
    totalLaps: 78,
    status: 'Green Flag' as 'Green Flag' | 'Safety Car' | 'Red Flag'
  });
  
  // State for file upload visibility
  const [uploadOpen, setUploadOpen] = useState(true);
  
  // Track the current lap for simulation
  const [simulatedLap, setSimulatedLap] = useState(raceStatus.currentLap);
  
  // Generate some mock actual positions for simulation
  const [actualPositions, setActualPositions] = useState([
    { driverId: 'VER', position: 1 },
    { driverId: 'HAM', position: 2 },
    { driverId: 'LEC', position: 3 },
    { driverId: 'NOR', position: 4 },
    { driverId: 'SAI', position: 5 },
  ]);
  
  // Enhanced leaderboard users with predictions
  const [enhancedLeaderboardData, setEnhancedLeaderboardData] = useState(() => {
    return MOCK_LEADERBOARD_DATA.map(user => ({
      ...user,
      predictions: MOCK_USER_PREDICTIONS[user.userId]
    }));
  });
  
  // Simulate lap advancement for demo purposes
  useEffect(() => {
    const lapTimer = setInterval(() => {
      setSimulatedLap(prevLap => {
        const newLap = prevLap + 1;
        if (newLap > raceStatus.totalLaps) {
          // Stop at the end of the race
          clearInterval(lapTimer);
          return raceStatus.totalLaps;
        }
        
        // Randomly shuffle actual positions every few laps
        if (newLap % 3 === 0) {
          const shuffledPositions = [...actualPositions]
            .sort(() => Math.random() - 0.5)
            .map((driver, index) => ({
              ...driver,
              position: index + 1
            }));
          setActualPositions(shuffledPositions);
        }
        
        return newLap;
      });
    }, 5000); // Advance lap every 5 seconds
    
    return () => clearInterval(lapTimer);
  }, []);
  
  // Update race status when simulated lap changes
  useEffect(() => {
    setRaceStatus(prev => ({
      ...prev,
      currentLap: simulatedLap
    }));
  }, [simulatedLap]);
  
  useEffect(() => {
    if (isAuthenticated && isActorAvailable && actor) {
      fetchUserStats();
      prepareChartData();
    }
  }, [isAuthenticated, isActorAvailable, user]);
  
  const fetchUserStats = async (): Promise<void> => {
    try {
      // Your code to fetch user stats
      console.log('Fetching user stats...');
      // Replace with actual API call
      setUserStats({
        totalPredictions: 15,
        accuracy: 78,
        rank: 42,
        points: 230
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  
  const prepareChartData = (): void => {
    // Updated to show friends group changes over laps
    const labels = Array.from({ length: 10 }, (_, i) => `Lap ${i * 5 + 5}`); // Laps 5, 10, 15...
    
    // Generate datasets for each friend in the group
    setChartData({
      labels,
      datasets: [
        {
          label: 'Tracy',
          data: labels.map((_, i) => 20 + i * 6 + Math.floor(Math.random() * 8)), 
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        },
        {
          label: 'Victor',
          data: labels.map((_, i) => 18 + i * 5.5 + Math.floor(Math.random() * 10)),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
        },
        {
          label: 'Joy',
          data: labels.map((_, i) => 15 + i * 5 + Math.floor(Math.random() * 7)),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
        {
          label: 'Ian',
          data: labels.map((_, i) => 12 + i * 4.5 + Math.floor(Math.random() * 8)),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
        },
        {
          label: 'Peter',
          data: labels.map((_, i) => 10 + i * 4 + Math.floor(Math.random() * 9)),
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
        }
      ]
    });
  };
  
  // Handle prediction file upload
  const handlePredictionUpload = (file: File): void => {
    console.log('Prediction file uploaded:', file);
    // Here you would normally process the file
    // For example, send it to your backend service
    alert(`Uploaded prediction file: ${file.name}`);
  };
  
  return (
    <div className="dashboard-container">
      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.username || 'Racer'}</h1>
      
      {/* Grid layout for desktop (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Race Status, Prediction Comparison, Prediction Upload */}
        <div className="space-y-6">
          {/* User Stats */}
          <div className="bg-gray-800 rounded-xl shadow-md p-4">
            <h2 className="text-xl font-bold text-white mb-4">Your Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-400 text-sm">Total Predictions</h3>
                <p className="text-white text-xl font-bold">{userStats.totalPredictions}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-400 text-sm">Accuracy</h3>
                <p className="text-white text-xl font-bold">{userStats.accuracy}%</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-400 text-sm">Rank</h3>
                <p className="text-white text-xl font-bold">#{userStats.rank}</p>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg">
                <h3 className="text-gray-400 text-sm">Points</h3>
                <p className="text-white text-xl font-bold">{userStats.points}</p>
              </div>
            </div>
          </div>
          
          {/* Prediction Comparison - Now in left column */}
          <PredictionComparison predictions={MOCK_PREDICTION_DATA} />
          
          {/* Prediction Upload */}
          <SimplePredictionUpload 
            isOpen={uploadOpen}
            cutoffLap={20}
            currentLap={raceStatus.currentLap}
            onUpload={handlePredictionUpload}
          />
        </div>
        
        {/* Middle and Right columns (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Friend Group Points Chart */}
          <div className="bg-gray-800 rounded-xl shadow-md p-4">
            <h2 className="text-xl font-bold text-white mb-4">Friends Group Points Over Laps</h2>
            <div className="h-64">
              <Line 
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        color: 'white'
                      }
                    },
                    title: {
                      display: false
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                      }
                    },
                    y: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      },
                      ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* Enhanced Real-time Leaderboard - Now below the chart */}
          <Leaderboard 
            users={enhancedLeaderboardData} 
            raceName={raceStatus.raceName}
            currentLap={raceStatus.currentLap}
            totalLaps={raceStatus.totalLaps}
            status={raceStatus.status}
            groupName="Friends Group"
            actualPositions={actualPositions}
            autoSimulate={false}
          />
          
          {/* Upcoming Races */}
          <div className="bg-gray-800 rounded-xl shadow-md p-4">
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Races</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingRaces?.map((race: F1Race, index: number) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
                  <h3 className="text-lg font-medium text-white">{race.name}</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    {race.sessions && race.sessions.length > 0 
                      ? new Date(race.sessions[0].startTime).toLocaleDateString() 
                      : 'TBD'}
                  </p>
                  <p className="text-gray-400 text-sm mb-3">{race.circuit.name}</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded transition-colors">
                    Make Prediction
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
