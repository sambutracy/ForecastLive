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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const { user } = useAuth();
  const { actor } = useCanister();
  const { 
    currentRace, 
    liveRaceData, 
    isConnected: isF1Connected,
    loadLiveRaceData 
  } = useF1LiveData();
  
  const [userScore, setUserScore] = useState(null);
  const [currentLap, setCurrentLap] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [raceData, setRaceData] = useState([]);
  const [isRaceRunning, setIsRaceRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allPredictions, setAllPredictions] = useState([]);
  const [groupStats, setGroupStats] = useState({
    totalParticipants: 0,
    totalPointsAcrossAllUsers: 0,
    averageScore: 0,
    topPerformer: null
  });

  useEffect(() => {
    if (actor && user) {
      // Check if actor has all the required methods
      const actorMethodsAvailable = checkActorMethods();
      
      if (actorMethodsAvailable) {
        console.log("Loading dashboard data with user:", user.principalText);
        loadDashboardData();
      } else {
        console.error("Cannot load dashboard data - actor methods are missing");
        setLoading(false);
        // Alert the user about the error
        setTimeout(() => {
          alert("Unable to connect to the prediction service. Please try refreshing the page.");
        }, 500);
      }
    }
  }, [actor, user]);

  // Effect to refresh live F1 data periodically
  useEffect(() => {
    if (isF1Connected && currentRace) {
      const refreshInterval = setInterval(() => {
        loadLiveRaceData(
          new Date().getFullYear(),
          currentRace.raceName,
          'Race'
        ).then(data => {
          if (data && data.currentLap !== currentLap) {
            console.log(`Lap change detected: ${currentLap} -> ${data.currentLap}`);
            
            // Update canister and dashboard if lap has changed
            if (actor) {
              // First update the race type in case it changed
              const isSprintRace = data.isSprintRace || false;
              actor.setCurrentRaceType(isSprintRace)
                .then(() => {
                  // Then update the lap
                  actor.updateCurrentLap(data.currentLap)
                    .then(() => {
                      console.log(`Updated lap to ${data.currentLap} and race type (sprint: ${isSprintRace})`);
                      loadDashboardData();
                    })
                    .catch(err => console.error("Failed to update lap:", err));
                })
                .catch(err => console.error("Failed to update race type:", err));
            }
          }
        })
        .catch(err => console.error("Error refreshing F1 data:", err));
      }, appConfig.f1.pollingIntervals.liveData);
      
      return () => clearInterval(refreshInterval);
    }
  }, [isF1Connected, currentRace, currentLap, actor]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current lap and race type from F1 live data service
      let currentLapData;
      let isSprintRace = false;
      
      if (liveRaceData) {
        currentLapData = liveRaceData;
        setCurrentLap(liveRaceData.currentLap);
        isSprintRace = liveRaceData.isSprintRace || false;
        
        // Update the canister with current race type
        if (actor) {
          try {
            await actor.setCurrentRaceType(isSprintRace);
            console.log(`Updated race type in canister (sprint: ${isSprintRace})`);
          } catch (error) {
            console.error("Error updating race type in canister:", error);
          }
        }
      } else {
        try {
          // Get current lap from canister as fallback
          const lap = await actor.getCurrentLap();
          setCurrentLap(lap);
        } catch (error) {
          console.error("Error getting current lap:", error);
          // Default to lap 1 if we can't get the current lap
          setCurrentLap(1);
        }
      }
      
      // Get race data from F1 live data service
      try {
        const data = await loadLiveRaceData(new Date().getFullYear(), 
          currentRace?.raceName || 'Latest Race', 'Race');
          
        if (data) {
          setRaceData([data]);
          // Update isSprintRace if we got new data
          isSprintRace = data.isSprintRace || false;
        }
      } catch (error) {
        console.error("Error loading race data:", error);
        // Keep existing race data if there's an error
      }
      
      // Get user score - this is critical for the dashboard
      try {
        console.log("Fetching user score for:", user.principalText);
        const score = await actor.calculateUserScore(user.principal);
        console.log("User score received:", score);
        setUserScore(score);
        
        // Try to get the user's prediction based on race type
        let prediction;
        if (isSprintRace) {
          prediction = await actor.getUserSprintPrediction(user.principal);
        } else {
          prediction = await actor.getUserPrediction(user.principal);
        }
        
        // Log user's prediction status
        if (prediction) {
          console.log(`User has a ${isSprintRace ? 'sprint' : 'main'} race prediction:`, prediction);
        } else {
          console.log(`No ${isSprintRace ? 'sprint' : 'main'} race prediction found for user`);
        }
      } catch (error) {
        console.error("Error getting user score:", error);
        // Initialize an empty score if we can't get the real one
        setUserScore({
          userId: user.principal,
          totalScore: 0.0,
          lapScores: [0.0]
        });
      }
      
      // Get leaderboard for current lap only (non-cumulative)
      try {
        const board = await actor.getLeaderboard();
        console.log("Leaderboard received:", board);
        
        // Process the leaderboard data to ensure we have per-lap scores
        const perLapBoard = board.map(entry => {
          // Get the current lap scores or default to empty array
          const lapScores = entry.lapScores || [];
          
          // Calculate per-lap (non-cumulative) scores
          const perLapScores = lapScores.map((score, index) => {
            if (index === 0) {
              // First lap score is already per-lap
              return score;
            } else {
              // For subsequent laps, subtract previous lap's cumulative score to get just this lap's score
              return score - lapScores[index - 1];
            }
          });
          
          return {
            ...entry,
            // For display in leaderboard, use the most recent lap score only
            totalScore: perLapScores.length > 0 ? 
              perLapScores[perLapScores.length - 1] : 0,
            // Store the non-cumulative lap scores for charts and detailed views
            lapScores: perLapScores,
            // Keep the original cumulative scores for reference
            cumulativeLapScores: lapScores
          };
        });
        
        setLeaderboard(perLapBoard);
        
        // Calculate group statistics based on per-lap scores
        calculateGroupStats(perLapBoard);
        
        console.log("Processed per-lap leaderboard:", perLapBoard);
      } catch (error) {
        console.error("Error getting leaderboard:", error);
        setLeaderboard([]);
      }
      
      // Get all predictions for group stats
      try {
        const predictions = await actor.getAllPredictions();
        console.log("All predictions received:", predictions);
        setAllPredictions(predictions);
      } catch (error) {
        console.error("Error getting predictions:", error);
        setAllPredictions([]);
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Show generic message to user
      alert("There was an error loading your prediction data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Check if actor methods are available
  const checkActorMethods = () => {
    if (!actor) {
      console.error("Actor is not available");
      return false;
    }
    
    const requiredMethods = [
      'calculateUserScore',
      'getCurrentLap',
      'getLeaderboard',
      'getAllPredictions'
    ];
    
    let allMethodsAvailable = true;
    
    requiredMethods.forEach(method => {
      if (!actor[method] || typeof actor[method] !== 'function') {
        console.error(`Required actor method '${method}' is missing or not a function`);
        allMethodsAvailable = false;
      }
    });
    
    return allMethodsAvailable;
  };

  const calculateGroupStats = (leaderboardData) => {
    if (leaderboardData.length === 0) {
      setGroupStats({
        totalParticipants: 0,
        totalPointsAcrossAllUsers: 0,
        averageScore: 0,
        topPerformer: null
      });
      return;
    }

    // Calculate total points based on the most recent lap for each user
    const totalPoints = leaderboardData.reduce((sum, entry) => {
      const scores = entry.lapScores || [];
      return sum + (scores.length > 0 ? scores[scores.length - 1] : 0);
    }, 0);
    
    const averageScore = totalPoints / leaderboardData.length;
    
    // Sort by most recent lap score to find the top performer
    const sortedByLatestScore = [...leaderboardData].sort((a, b) => {
      const aScores = a.lapScores || [];
      const bScores = b.lapScores || [];
      const aLatest = aScores.length > 0 ? aScores[aScores.length - 1] : 0;
      const bLatest = bScores.length > 0 ? bScores[bScores.length - 1] : 0;
      return bLatest - aLatest;
    });
    
    const topPerformer = sortedByLatestScore[0];

    setGroupStats({
      totalParticipants: leaderboardData.length,
      totalPointsAcrossAllUsers: totalPoints,
      averageScore: averageScore,
      topPerformer: topPerformer
    });
  };

  const startRace = async () => {
    setIsRaceRunning(true);
    
    try {
      // Try to get actual F1 data first
      const f1Data = await loadLiveRaceData(
        new Date().getFullYear(), 
        currentRace?.raceName || 'Latest Race', 
        'Race'
      );
      
      if (!f1Data) {
        // If no real data, simulate race progression
        for (let lap = 1; lap <= 5; lap++) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds per lap
          
          // Update the lap in the canister
          await actor.updateCurrentLap(lap);
          setCurrentLap(lap);
          
          // Reload data after each lap
          await loadDashboardData();
        }
      } else {
        // If we got real data, use that lap
        await actor.updateCurrentLap(f1Data.currentLap);
        setCurrentLap(f1Data.currentLap);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error during race simulation:", error);
    } finally {
      setIsRaceRunning(false);
    }
  };

  // Function to fetch real F1 data and update the dashboard
  const updateLiveData = async () => {
    setIsRaceRunning(true);
    try {
      const f1Data = await loadLiveRaceData(
        new Date().getFullYear(), 
        currentRace?.raceName || 'Latest Race', 
        'Race'
      );
      
      if (f1Data) {
        await actor.updateCurrentLap(f1Data.currentLap);
        setCurrentLap(f1Data.currentLap);
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Error updating live data:", error);
    } finally {
      setIsRaceRunning(false);
    }
  };

  // Transform lap scores to ensure we display per-lap points, not cumulative
  const transformLapScores = (scores) => {
    if (!scores || scores.length === 0) return [];
    
    // For each lap, show that lap's individual score, not cumulative
    return scores.map((score, index) => {
      // If this is the first lap, the score is already correct
      if (index === 0) return score;
      
      // For subsequent laps, we want to show the actual points earned that lap
      // This assumes scores are cumulative in the original data
      return Math.max(0, score - scores[index - 1]);
    });
  };

  const chartData = {
    labels: (userScore?.lapScores || []).map((_, index) => `Lap ${index + 1}`),
    datasets: [
      // Current user's scores
      {
        label: 'Your Score',
        // Use per-lap scores instead of cumulative
        data: transformLapScores(userScore?.lapScores || []),
        borderColor: 'rgb(255, 140, 0)',     // Orange
        backgroundColor: 'rgba(255, 140, 0, 0.1)',
        tension: 0.1,
        fill: false,
        borderWidth: 3,
      },
      // Top 3 other users for comparison
      ...leaderboard.slice(0, 3).filter(entry => 
        entry.userId.toText() !== user.principal.toText()
      ).map((entry, index) => ({
        label: `User ${entry.userId.toText().slice(0, 8)}...`,
        // Use per-lap scores instead of cumulative
        data: transformLapScores(entry.lapScores) || [],
        borderColor: ['rgb(255, 215, 0)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)'][index], // Gold, light orange, yellow
        backgroundColor: `rgba(${['255, 215, 0', '251, 146, 60', '234, 179, 8'][index]}, 0.1)`,
        tension: 0.1,
        fill: false,
        borderWidth: 2,
      }))
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Points Earned Per Lap',
      },
      tooltip: {
        callbacks: {
          title: (context) => `${context[0].label}`,
          label: (context) => {
            const value = context.raw || 0;
            return `${context.dataset.label}: ${value.toFixed(1)} points`;
          },
          footer: (context) => {
            return 'Points earned on this specific lap';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
          callback: function(value) {
            return value.toFixed(1) + ' pts';
          }
        },
        title: {
          display: true,
          text: 'Points Earned',
          color: 'rgba(255, 255, 255, 0.7)',
        },
        // Set a reasonable maximum so the chart doesn't scale too high
        // This should be adjusted based on F1 scoring (25 pts for 1st, etc.)
        suggestedMax: 30,
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
        title: {
          display: true,
          text: 'Race Progress',
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userScore) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-bold mb-2">No Prediction Found</h2>
          <p className="text-gray-400 mb-6">
            You haven't submitted a prediction yet. Upload your F1 prediction to start tracking your score!
          </p>
          <button 
            className="btn-primary mt-2"
            onClick={() => window.location.href = '#/prediction-upload'}
          >
            Upload Prediction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Live F1 Data Status */}
      {currentRace && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isF1Connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-medium">
                  {isF1Connected ? 'Live F1 Data Connected' : 'Live F1 Data Offline'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {currentRace.raceName} • {currentRace.country}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {liveRaceData && (
                <div className="text-sm text-gray-600">
                  {liveRaceData.sessionType} • {liveRaceData.sessionStatus}
                  {liveRaceData.currentLap > 0 && (
                    <span className="ml-2">Lap {liveRaceData.currentLap}/{liveRaceData.totalLaps}</span>
                  )}
                </div>
              )}
              <button
                onClick={() => loadLiveRaceData(new Date().getFullYear(), currentRace.raceName, 'Race')}
                className="btn-primary text-sm py-1 px-3"
              >
                Refresh Live Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Race Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🏁 F1 Race Data</h2>
            <p className="text-gray-400">
              {liveRaceData ? 
                `Lap ${liveRaceData.currentLap}/${liveRaceData.totalLaps} | ` : 
                `Current Lap: ${currentLap} | `}
              {groupStats.totalParticipants} players competing
            </p>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => loadLiveRaceData(
                new Date().getFullYear(), 
                currentRace?.raceName || 'Latest Race', 
                'Race'
              )}
              className="btn-primary"
            >
              Refresh Race Data
            </button>
            <button
              onClick={() => {
                if (isF1Connected) {
                  // If we have live data connection, refresh it
                  loadLiveRaceData(
                    new Date().getFullYear(), 
                    currentRace?.raceName || 'Latest Race', 
                    'Race'
                  );
                } else {
                  // Otherwise simulate race progression
                  startRace();
                }
              }}
              disabled={isRaceRunning}
              className="btn-secondary disabled:opacity-50"
            >
              {isRaceRunning ? 'Loading Data...' : 
                isF1Connected ? 'Update Live Data' : 'Simulate Race'}
            </button>
          </div>
        </div>
      </div>

      {/* Group Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Your Current Points</h3>
          <div className="text-3xl font-bold text-orange-500">
            {/* Show only the most recent lap score or 0 if none */}
            {(userScore.lapScores && userScore.lapScores.length > 0 
              ? userScore.lapScores[userScore.lapScores.length - 1] 
              : 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">
            Last Lap: {
              userScore.lapScores && userScore.lapScores.length >= 2 
              ? `+${(userScore.lapScores[userScore.lapScores.length - 1] - 
                   userScore.lapScores[userScore.lapScores.length - 2]).toFixed(1)}`
              : '0.0'
            }
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Group Points (Last Lap)</h3>
          <div className="text-3xl font-bold text-yellow-500">
            {/* Calculate total points for the last lap only */}
            {leaderboard.reduce((total, entry) => {
              const scores = entry.lapScores || [];
              if (scores.length < 2) return total;
              return total + (scores[scores.length - 1] - scores[scores.length - 2]);
            }, 0).toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">{groupStats.totalParticipants} players</div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Average Points</h3>
          <div className="text-3xl font-bold text-accent">
            {/* Calculate average for last lap only */}
            {(leaderboard.reduce((total, entry) => {
              const scores = entry.lapScores || [];
              if (scores.length === 0) return total;
              return total + scores[scores.length - 1];
            }, 0) / Math.max(1, leaderboard.length)).toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">Current Lap: {currentLap}</div>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Your Position</h3>
          <div className="text-3xl font-bold text-primary">
            #{leaderboard.findIndex(entry => 
              entry.userId.toText() === user.principal.toText()
            ) + 1 || 'N/A'}
          </div>
          <div className="text-sm text-gray-400">of {groupStats.totalParticipants}</div>
        </div>
      </div>

      {/* Group Competition Chart */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">🏆 Group Competition - Points Per Lap</h3>
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className="text-sm text-gray-400 mt-2">
          Your score is highlighted in orange. Compare with top performers!
        </div>
      </div>

      {/* Lap-by-Lap Breakdown */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Lap-by-Lap Points Earned</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {userScore && userScore.lapScores && userScore.lapScores.length > 0 ? (
            userScore.lapScores.map((score, index) => {
              // Calculate the points earned in this specific lap
              const previousScore = index > 0 ? userScore.lapScores[index - 1] : 0;
              const earnedInLap = index === 0 ? score : score - previousScore;
              
              return (
                <div key={index} className="bg-secondary p-4 rounded-lg text-center">
                  <div className="text-lg font-bold text-primary">Lap {index + 1}</div>
                  <div className="text-2xl font-bold text-orange-500">{earnedInLap.toFixed(1)}</div>
                  <div className="text-sm text-gray-400">points earned</div>
                  <div className="text-xs text-gray-500 mt-1">Total: {score.toFixed(1)}</div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center text-gray-400 py-8">
              <p className="mb-4">No lap scores available yet</p>
              {currentLap === 0 ? (
                <p>Race has not started. Scores will appear when the race begins.</p>
              ) : (
                <p>You may need to submit a prediction first, or wait for race data.</p>
              )}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-400 mt-4">
          <strong>Note:</strong> Points shown are those earned in each individual lap, not cumulative totals.
        </div>
      </div>

      {/* Race Positions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Current Race Positions</h3>
          {liveRaceData && (
            <div className="text-sm text-gray-600">
              {isF1Connected ? '🔴 Live F1 Data' : '📊 Simulation Data'}
            </div>
          )}
        </div>
        
        {/* Live F1 Data Positions */}
        {liveRaceData && liveRaceData.results && liveRaceData.results.length > 0 ? (
          <div>
            <div className="mb-3 p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
              <div>
                <span className="font-bold">{liveRaceData.sessionType}</span>
                <span className="ml-2 text-sm px-2 py-0.5 rounded bg-green-700 text-white">
                  {liveRaceData.sessionStatus}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  Lap <span className="font-bold">{liveRaceData.currentLap}</span>/<span className="text-gray-400">{liveRaceData.totalLaps}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(liveRaceData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveRaceData.results.slice(0, 10).map((driver, index) => (
                <div key={driver.driverCode} className="bg-secondary p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      driver.position === 1 ? 'bg-yellow-400 text-black' :
                      driver.position === 2 ? 'bg-gray-300 text-black' :
                      driver.position === 3 ? 'bg-orange-400 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {driver.position}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{driver.driverCode}</div>
                      <div className="text-xs text-gray-400">{driver.team}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono">
                      {driver.time ? driver.time : driver.status !== "Running" ? driver.status : ""}
                    </div>
                    <div className="text-xs text-yellow-400">
                      {driver.points > 0 ? `+${driver.points} pts` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : raceData.length > 0 ? (
          /* Fallback to simulation data */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {raceData[0]?.results?.map((driver, index) => (
              <div key={index} className="bg-secondary p-3 rounded-lg text-center">
                <div className="font-bold text-lg">P{index + 1}</div>
                <div className="text-sm font-semibold">{driver.driverCode}</div>
                <div className="text-xs text-gray-400">{driver.team}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">🏁</div>
            <p>No race position data available</p>
            {currentRace && (
              <button
                onClick={() => loadLiveRaceData(new Date().getFullYear(), currentRace.raceName, 'Race')}
                className="mt-3 btn-primary"
              >
                Load Live Race Data
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gamified Leaderboard */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">🏆 Friends Leaderboard</h3>
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Based on {currentLap > 0 ? `points earned through lap ${currentLap}` : 'current standings'}
          </div>
          <div className="text-sm text-gray-400">
            Max possible points per lap: 25 (perfect prediction)
          </div>
        </div>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.userId.toText() === user.principal.toText();
            const isTopThree = index < 3;
            const medals = ['🥇', '🥈', '🥉'];
            
            // Calculate points earned in the last lap
            const scores = entry.lapScores || [];
            const lastLapPoints = scores.length >= 2 ? 
              scores[scores.length - 1] - scores[scores.length - 2] : 
              scores.length === 1 ? scores[0] : 0;
            
            // Calculate per-lap average
            const averagePerLap = scores.length > 0 ? 
              scores[scores.length - 1] / scores.length : 0;
            
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  isCurrentUser
                    ? 'bg-orange-500/20 border-2 border-orange-500 transform scale-105'
                    : isTopThree 
                    ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-600'
                    : 'bg-secondary hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    isTopThree ? 'bg-yellow-500 text-black' : 'bg-primary text-white'
                  }`}>
                    {isTopThree ? medals[index] : index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {isCurrentUser ? '👑 You' : `🎮 User ${entry.userId.toText().slice(0, 8)}...`}
                      {index === 0 && !isCurrentUser && ' 👑'}
                    </div>
                    <div className="flex gap-3 text-sm text-gray-400">
                      <span>
                        {scores.length} {scores.length === 1 ? 'lap' : 'laps'} completed
                      </span>
                      {scores.length > 0 && (
                        <span className="text-orange-400">
                          +{lastLapPoints.toFixed(1)} last lap
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {/* Show total points */}
                    {scores.length > 0 ? scores[scores.length - 1].toFixed(1) : "0.0"}
                  </div>
                  <div className="text-sm text-gray-400">
                    {averagePerLap > 0 ? 
                      `${averagePerLap.toFixed(1)} pts/lap` : 
                      'points'
                    }
                  </div>
                </div>
              </div>
            );
          })}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🏁</div>
              <p>No predictions submitted yet. Be the first to join the race!</p>
            </div>
          )}
        </div>
        
        {groupStats.topPerformer && (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-orange-400">🏆 Current Leader</div>
                <div className="text-sm text-gray-300">
                  {groupStats.topPerformer.userId.toText() === user.principal.toText() ? 
                    'You are leading the pack! 🎉' : 
                    `User ${groupStats.topPerformer.userId.toText().slice(0, 8)}... is ahead`
                  }
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">
                  {/* Show most recent lap score */}
                  {groupStats.topPerformer.lapScores && groupStats.topPerformer.lapScores.length > 0 ?
                    groupStats.topPerformer.lapScores[groupStats.topPerformer.lapScores.length - 1].toFixed(1) : 
                    '0.0'
                  }
                </div>
                <div className="text-xs text-orange-300 text-right">
                  {/* Calculate points per lap average */}
                  {groupStats.topPerformer.lapScores && groupStats.topPerformer.lapScores.length > 0 ?
                    `${(groupStats.topPerformer.lapScores[groupStats.topPerformer.lapScores.length - 1] / 
                    groupStats.topPerformer.lapScores.length).toFixed(1)} pts/lap` : 
                    '0.0 pts/lap'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
