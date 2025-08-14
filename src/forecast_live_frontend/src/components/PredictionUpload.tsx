import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import { useCanister } from '../contexts/CanisterContext';
import { useF1LiveData } from '../contexts/F1LiveDataContext';
import axios from 'axios';
import appConfig from '../config/appConfig';

// Extended Race interface with hasSprintRace property
interface CurrentRace {
  id: string;
  name: string;
  round: number;
  circuit: {
    name: string;
    location: string;
    country: string;
  };
  status: 'upcoming' | 'live' | 'completed';
  hasSprintRace?: boolean;
  [key: string]: any;
}

interface DriverData {
  name: string;
  team: string;
}

interface DriverDataMap {
  [code: string]: DriverData;
}

interface AIApiResponse {
  success: boolean;
  prediction: string[];
  confidence?: number;
  message?: string;
}

const PredictionUpload: React.FC = () => {
  const { user } = useAuth();
  const { actor } = useCanister();
  const { currentRace } = useF1LiveData();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isForSprint, setIsForSprint] = useState<boolean>(false);
  const [hasSprintRace, setHasSprintRace] = useState<boolean>(false);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  // Complete driver data with codes and full names
  const driverData: DriverDataMap = {
    'VER': { name: 'Max Verstappen', team: 'Red Bull Racing' },
    'HAM': { name: 'Lewis Hamilton', team: 'Mercedes' },
    'LEC': { name: 'Charles Leclerc', team: 'Ferrari' },
    'NOR': { name: 'Lando Norris', team: 'McLaren' },
    'ALO': { name: 'Fernando Alonso', team: 'Aston Martin' },
    'SAI': { name: 'Carlos Sainz', team: 'Ferrari' },
    'RUS': { name: 'George Russell', team: 'Mercedes' },
    'TSU': { name: 'Yuki Tsunoda', team: 'RB' },
    'PER': { name: 'Sergio Pérez', team: 'Red Bull Racing' },
    'HUL': { name: 'Nico Hülkenberg', team: 'Haas F1 Team' },
    'PIA': { name: 'Oscar Piastri', team: 'McLaren' },
    'STR': { name: 'Lance Stroll', team: 'Aston Martin' },
    'OCO': { name: 'Esteban Ocon', team: 'Alpine' },
    'GAS': { name: 'Pierre Gasly', team: 'Alpine' },
    'MAG': { name: 'Kevin Magnussen', team: 'Haas F1 Team' },
    'ZHO': { name: 'Zhou Guanyu', team: 'Stake F1 Team' },
    'RIC': { name: 'Daniel Ricciardo', team: 'RB' },
    'BOT': { name: 'Valtteri Bottas', team: 'Stake F1 Team' },
    'SAR': { name: 'Logan Sargeant', team: 'Williams' },
    'ALB': { name: 'Alexander Albon', team: 'Williams' }
  };

  // AI service URL from config
  const AI_API_URL = appConfig.f1Data.endpoints.ocr;
  
  // Fallback prediction if AI processing fails
  const fallbackPrediction = ['VER', 'HAM', 'LEC', 'NOR', 'ALO', 'SAI', 'RUS', 'TSU', 'PER', 'HUL'];

  const processPredictionImage = async (imageData: string): Promise<void> => {
    setLoading(true);
    setProcessingError(null);
    
    try {
      // Try to use the AI service
      const response = await axios<AIApiResponse>({
        method: 'POST',
        url: `${appConfig.F1_DATA_SERVICE_URL}${AI_API_URL}`,
        data: {
          image: imageData.split(',')[1], // Remove the data:image/* prefix
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds timeout
      });
      
      if (response.data && response.data.success && response.data.prediction) {
        // Process and validate driver codes
        const validatedPrediction = response.data.prediction
          .filter(code => driverData[code]) // Only include valid driver codes
          .slice(0, 10); // Take top 10
        
        if (validatedPrediction.length === 10) {
          setPrediction(validatedPrediction);
        } else {
          // Not enough valid drivers, use detected drivers + fallback for missing
          const missingCount = 10 - validatedPrediction.length;
          const missingDrivers = fallbackPrediction
            .filter(code => !validatedPrediction.includes(code))
            .slice(0, missingCount);
          
          setPrediction([...validatedPrediction, ...missingDrivers]);
          setProcessingError("Some drivers couldn't be identified. We've used our best guess to complete your prediction.");
        }
      } else {
        throw new Error("Invalid response from AI service");
      }
    } catch (error) {
      console.error("Error processing image with AI:", error);
      
      // For development/demo purposes, simulate success with fallback data
      setPrediction(fallbackPrediction);
      setProcessingError("We couldn't process your image with our AI. We've provided a sample prediction you can edit before submitting.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const imageData = e.target?.result as string;
        setUploadedImage(imageData);
        processPredictionImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  // Check the current race lap to determine if prediction submission is allowed
  useEffect(() => {
    async function checkRaceLap() {
      if (actor) {
        try {
          // Get current lap from canister
          const currentLap = await actor.getCurrentLap();
          console.log("Current lap:", currentLap);
          
          // Check if we have existing predictions
          if (user) {
            try {
              // Check if we already have a prediction for the current race type
              const existingPrediction = isForSprint 
                ? await actor.getUserSprintPrediction(user.principal)
                : await actor.getUserPrediction(user.principal);
                
              if (existingPrediction) {
                console.log(`Found existing ${isForSprint ? 'sprint' : 'main'} race prediction:`, existingPrediction);
                
                // Set the prediction we already have
                setPrediction(existingPrediction.prediction);
                setSubmitted(true);
              }
            } catch (error) {
              console.error("Error checking existing predictions:", error);
            }
          }
          
          // Deadline is 30 laps (from F1Types.maxPredictionLap)
          setDeadlinePassed(currentLap > 30);
        } catch (error) {
          console.error("Error fetching current lap:", error);
          // Assume predictions are still open if we can't determine
          setDeadlinePassed(false);
        }
      }
    }
    
    if (currentRace) {
      const hasSprintRaceWeekend = (currentRace as CurrentRace).hasSprintRace || false;
      setHasSprintRace(hasSprintRaceWeekend);
      
      // Check current lap and existing predictions
      checkRaceLap();
      
      // Check lap and predictions every 30 seconds
      const lapCheckInterval = setInterval(checkRaceLap, 30000);
      return () => clearInterval(lapCheckInterval);
    }
  }, [currentRace, actor, user, isForSprint]);

  const handleSubmit = async (): Promise<void> => {
    if (!prediction || !actor || !user) return;
    
    if (deadlinePassed) {
      setProcessingError('Predictions are closed after lap 30');
      return;
    }
    
    setLoading(true);
    try {
      // Pass the isForSprint flag to indicate what type of prediction this is
      const result = await actor.storePrediction(user.principal, prediction, isForSprint);
      if (result.ok !== undefined) {
        setSubmitted(true);
      } else {
        setProcessingError('Error storing prediction: ' + result.err);
      }
    } catch (error) {
      console.error('Error submitting prediction:', error);
      setProcessingError('Error submitting prediction to the blockchain. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const resetPrediction = (): void => {
    setUploadedImage(null);
    setPrediction(null);
    setProcessingError(null);
  };
  
  // Toggle between sprint and main race
  const toggleRaceType = (): void => {
    // Only allow toggling if we haven't submitted yet
    if (!submitted) {
      setIsForSprint(!isForSprint);
      resetPrediction();
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            {isForSprint ? "Sprint Race Prediction Submitted!" : "Main Race Prediction Submitted!"}
          </h2>
          <p className="text-gray-400 mb-6">
            Your F1 prediction has been stored on-chain. Check the dashboard to see your score during the race!
          </p>
          
          {/* Race type indicator */}
          <div className="inline-flex rounded-md bg-gray-800 p-1 mb-6">
            <div className={`px-4 py-2 rounded-md ${!isForSprint ? 'bg-blue-500 text-white' : 'text-gray-300'}`}>
              Main Race
            </div>
            <div className={`px-4 py-2 rounded-md ${isForSprint ? 'bg-red-500 text-white' : 'text-gray-300'}`}>
              Sprint Race
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                // Reset submission and create a new prediction
                setSubmitted(false);
                resetPrediction();
                // Toggle race type for next prediction if there's a sprint race
                if (hasSprintRace) {
                  setIsForSprint(!isForSprint);
                }
              }}
              className="btn-primary"
            >
              {hasSprintRace 
                ? `Submit ${isForSprint ? "Main Race" : "Sprint Race"} Prediction` 
                : "Submit Another Prediction"}
            </button>
            <button
              onClick={() => window.location.href = '#/dashboard'}
              className="btn-secondary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Show deadline warning if deadline has passed
  if (deadlinePassed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <div className="text-6xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">
            Prediction Deadline Passed
          </h2>
          <p className="text-gray-400 mb-6">
            The deadline for submitting predictions has passed. According to Forecast F1 rules:
            <ul className="list-disc text-left pl-8 mt-3">
              <li>Normal race weekends: Predictions must be submitted before Practice 3</li>
              <li>Sprint race weekends: Predictions must be submitted before Practice 1</li>
            </ul>
          </p>
          <div className="mt-4">
            <button
              onClick={() => window.location.href = '#/dashboard'}
              className="btn-secondary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-2 text-center">
          Upload Your F1 Prediction
        </h2>
        <p className="text-center text-gray-400 mb-6">
          Predictions can be submitted during the first 30 laps of the race
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Race Type Selector - Only show if it's a sprint race weekend */}
          {hasSprintRace && (
            <div className="lg:col-span-2 mb-2">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-center mb-2">Select Race Type</h3>
                <div className="flex justify-center">
                  <div className="inline-flex rounded-md bg-gray-900 p-1">
                    <button
                      type="button"
                      className={`px-6 py-3 rounded-md transition-colors ${!isForSprint ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                      onClick={() => setIsForSprint(false)}
                      disabled={deadlinePassed}
                    >
                      <span className="font-bold">Main Race</span>
                      <span className="block text-xs mt-1 opacity-75">Sunday Grand Prix</span>
                    </button>
                    <button
                      type="button"
                      className={`px-6 py-3 rounded-md transition-colors ${isForSprint ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                      onClick={() => setIsForSprint(true)}
                      disabled={deadlinePassed}
                    >
                      <span className="font-bold">Sprint Race</span>
                      <span className="block text-xs mt-1 opacity-75">Saturday Sprint</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                  {isForSprint 
                    ? "Your prediction will be used for the Saturday Sprint race"
                    : "Your prediction will be used for the Sunday Main race"}
                </p>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-accent bg-accent/10' : 'hover:border-gray-500'
              } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} disabled={loading} />
              {uploadedImage ? (
                <div>
                  <img
                    src={uploadedImage}
                    alt="Uploaded prediction"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <div className="mt-3 flex justify-center gap-2">
                    {!loading && (
                      <button 
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md px-3 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetPrediction();
                        }}
                      >
                        Reset
                      </button>
                    )}
                    <p className="text-xs text-gray-400">
                      {loading ? 'Processing...' : 'Click to upload a different image'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">📸</div>
                  <p className="text-lg mb-2">
                    {isDragActive
                      ? 'Drop your F1 prediction screenshot here'
                      : 'Upload your F1 prediction screenshot'}
                  </p>
                  <p className="text-sm text-gray-400 mb-3">
                    PNG, JPG files up to 10MB
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Our AI will extract driver predictions from your screenshot
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 text-gray-400">How it works:</h4>
              <ol className="text-sm text-gray-500 list-decimal pl-5 space-y-1">
                <li>Upload a screenshot of your F1 race predictions</li>
                <li>Our AI will analyze the image and extract driver codes</li>
                <li>Review and adjust the predictions if needed</li>
                <li>Submit to store your prediction on-chain</li>
              </ol>
            </div>
          </div>
          
          {/* Prediction Results */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Your Prediction</h3>
              
              {processingError && (
                <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 px-4 py-3 rounded-md mb-4 text-sm">
                  <div className="font-medium">⚠️ {processingError}</div>
                </div>
              )}
              
              {loading && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
              
              {prediction && !loading && (
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-400">Driver Predictions</h4>
                      <span className="text-xs text-gray-500">Drag to reorder</span>
                    </div>
                    
                    <ul className="space-y-2">
                      {prediction.map((driverCode, index) => (
                        <li 
                          key={index}
                          className="flex items-center bg-gray-900 p-2 rounded-lg"
                        >
                          <div className="flex-none w-8 h-8 flex items-center justify-center bg-gray-700 rounded-full font-bold text-sm mr-3">
                            P{index + 1}
                          </div>
                          <div className="flex-grow flex flex-col">
                            <div className="flex items-center">
                              <span className="font-mono font-bold text-primary mr-2">{driverCode}</span>
                              <span className="text-sm">{driverData[driverCode]?.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">{driverData[driverCode]?.team}</span>
                          </div>
                          <div className="flex-none flex gap-1">
                            {index > 0 && (
                              <button 
                                onClick={() => {
                                  const newPrediction = [...prediction];
                                  [newPrediction[index], newPrediction[index - 1]] = [newPrediction[index - 1], newPrediction[index]];
                                  setPrediction(newPrediction);
                                }}
                                className="p-1 text-gray-400 hover:text-white"
                                aria-label="Move up"
                              >
                                ↑
                              </button>
                            )}
                            {index < prediction.length - 1 && (
                              <button 
                                onClick={() => {
                                  const newPrediction = [...prediction];
                                  [newPrediction[index], newPrediction[index + 1]] = [newPrediction[index + 1], newPrediction[index]];
                                  setPrediction(newPrediction);
                                }}
                                className="p-1 text-gray-400 hover:text-white"
                                aria-label="Move down"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !prediction || prediction.length !== 10 || deadlinePassed}
                    className={`w-full py-3 rounded-lg font-medium mt-4 ${
                      loading || !prediction || prediction.length !== 10 || deadlinePassed
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {loading ? 'Submitting...' : `Submit ${isForSprint ? 'Sprint' : 'Race'} Prediction`}
                  </button>
                </div>
              )}
              
              {!prediction && !loading && (
                <div className="text-center py-6 text-gray-400">
                  <p>Upload a prediction image to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionUpload;
