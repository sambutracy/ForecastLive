# Forecast Live - Documentation

This file serves as the central documentation for the Forecast Live F1 prediction dApp. It consolidates information from various standalone documents into a single, organized reference.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Data Model](#data-model)
5. [F1 Data Integration](#f1-data-integration)
6. [Scoring System](#scoring-system)
7. [Authentication](#authentication)
8. [Development Guide](#development-guide)
9. [API Endpoints](#api-endpoints)
10. [Troubleshooting](#troubleshooting)

## Project Overview

Forecast Live is an Internet Computer Protocol (ICP) dApp for Formula 1 predictions. Users can upload their race predictions, the system will parse the screenshots, and score these predictions based on real F1 race results, providing live updates and a competitive leaderboard.

## Technology Stack

- **Backend**: Motoko canisters on Internet Computer Protocol
- **Frontend**: React with TailwindCSS
- **Authentication**: Internet Identity and NFID
- **Data Visualization**: Chart.js with react-chartjs-2
- **File Upload**: react-dropzone for screenshot upload
- **F1 Data**: Ergast API (via HTTP outcalls) with local data processing

## Architecture

Forecast Live is built on the Internet Computer Protocol (ICP) using a multi-canister architecture.

### Canisters
1. **PredictionService** - Core business logic for predictions, groups, and leaderboards
2. **F1DataService** - Fetches and processes F1 race data 
3. **AIPredictionService** - Handles screenshot parsing and validation

### Frontend
- React.js application with Tailwind CSS
- Internet Computer Agent integration
- Internet Identity authentication
- Real-time data updates

### Data Flow
1. Users authenticate using Internet Identity or NFID
2. Predictions are submitted via screenshot uploads
3. Screenshots are parsed to extract driver order
4. During races, live data is fetched and processed
5. Scores are calculated based on current positions
6. Leaderboards are updated in real-time

## Data Model

### ICP On-Chain Data
The Motoko backend fetches and stores real F1 data on-chain using HTTP outcalls:

```motoko
// Fetch F1 Race Schedule from Ergast API
public func fetchF1RaceSchedule() : async Result.Result<[F1RaceSchedule], Text>

// Fetch live F1 race data from Ergast API  
public func fetchF1LiveData(round: Nat) : async Result.Result<F1LiveData, Text>
```

Benefits of on-chain F1 data:
- **Transparency**: All race data and scoring is verifiable
- **Immutability**: Predictions and results can't be tampered with
- **Decentralization**: No single point of failure
- **Global Access**: Available worldwide without geographic restrictions

### Local F1 Data Service (Development)
For development, a local Python-based F1 data service provides:
- Fast-F1 library integration for detailed timing data
- Ergast API support for historical race information
- WebSockets for real-time updates

### Features of Live F1 Data Integration

1. **Live Race Tracker**
   - Real-time race positions and timing
   - Session status (Practice, Qualifying, Race)
   - Lap-by-lap progression
   - Driver status and timing information

2. **Race Schedule**
   - Complete F1 calendar with session times
   - Current race weekend detection
   - Session schedule with time zones

3. **Enhanced Dashboard**
   - Live F1 data connection status
   - Real race positions integrated with predictions
   - Visual indicators for data sources

### Data Sources

- **Ergast API**: Historical F1 data from 1950-present, race results, driver standings, etc.
- **Fast-F1**: Official F1 timing data, telemetry, and session information (available from 2018 onwards)
- **Mock Data Fallback**: When services are unavailable, the system uses realistic simulation data

## Scoring System

Forecast Live uses a position-based scoring system that awards points based on how accurately users predict each driver's final position:

### Scoring Rules

- **Exact position match**: 100% of position points
  - P1 = 25 points
  - P2 = 18 points
  - P3 = 15 points
  - P4 = 12 points
  - P5 = 10 points
  - P6 = 8 points
  - P7 = 6 points
  - P8 = 4 points
  - P9 = 2 points
  - P10 = 1 point
  
- **1 position off**: 50% of position points
- **2 positions off**: 25% of position points
- **3 positions off**: 12.5% of position points
- **More than 3 off**: 0 points

### Example Scoring

If a user predicts:
1. VER, 2. HAM, 3. LEC, 4. NOR, 5. ALO, 6. SAI, 7. RUS, 8. TSU, 9. PER, 10. HUL

And the actual lap results are:
1. VER, 2. LEC, 3. HAM, 4. NOR, 5. ALO, 6. SAI, 7. RUS, 8. TSU, 9. PER, 10. HUL

The scoring would be:
- P1: VER predicted, VER actual → 25 points (exact match)
- P2: HAM predicted, LEC actual → 0 points (HAM is in P3, 1 off = 18 × 0.5 = 9 points)
- P3: LEC predicted, HAM actual → 0 points (LEC is in P2, 1 off = 15 × 0.5 = 7.5 points)
- P4: NOR predicted, NOR actual → 12 points (exact match)
- P5: ALO predicted, ALO actual → 10 points (exact match)
- P6: SAI predicted, SAI actual → 8 points (exact match)
- P7: RUS predicted, RUS actual → 6 points (exact match)
- P8: TSU predicted, TSU actual → 4 points (exact match)
- P9: PER predicted, PER actual → 2 points (exact match)
- P10: HUL predicted, HUL actual → 1 point (exact match)

Total for this lap: 25 + 9 + 7.5 + 12 + 10 + 8 + 6 + 4 + 2 + 1 = 84.5 points

## Authentication

### NFID Authentication
The primary authentication method uses NFID (Non-Fungible Identity):
- Secure blockchain-based identity
- Principal IDs for user identification
- Persistence between sessions

### Development Mode
For development, a mock authentication option is available that bypasses the need for blockchain interaction.

## Development Guide

### Starting the F1 Data Service
```bash
# Windows
cd f1_data_service
setup.bat
venv\Scripts\activate
python app.py

# Linux/Mac
cd f1_data_service
chmod +x setup.sh
./setup.sh
source venv/bin/activate
python app.py
```

### Starting the Frontend
```bash
cd src/forecast_live_frontend
npm install
npm run dev
```

### Deploying to ICP
```bash
# Start local replica
dfx start --clean --background

# Deploy canister
dfx deploy

# For production deployment
dfx deploy --network ic
```

## API Endpoints

### F1 Data Service API

#### Get Race Schedule
```http
GET http://localhost:5000/api/schedule
```

#### Get Current Race Weekend
```http
GET http://localhost:5000/api/current-race
```

#### Get Live Race Data
```http
GET http://localhost:5000/api/live-data?year=2024&gp=Bahrain&session=Race
```

### WebSocket Connection
```javascript
const socket = io('http://localhost:5000');
socket.emit('subscribe_live_timing');
```

### Motoko Canister Methods

```
storePrediction(userId: Principal, prediction: [Text], isForSprint: Bool)
getUserPrediction(userId: Principal)
getUserSprintPrediction(userId: Principal)
getAllPredictions()
setRaceData(data: [RaceData])
getRaceData()
updateCurrentLap(lap: Nat)
getCurrentLap()
calculateUserScore(userId: Principal)
getLeaderboard()
```

## Troubleshooting

### Common Issues

1. **"Live F1 Data Offline" Status**
   - Check if F1 data service is running on port 5000
   - Verify network connectivity
   - Check service logs for errors

2. **No Live Data During Race Weekend**
   - Fast-F1 has delays for archived data (30-120 minutes)
   - Live data is only available during active sessions
   - Service falls back to mock data automatically

3. **Authentication Issues**
   - NFID dependency conflicts in development
   - Try using mock authentication during development
   - Clear browser cache and try again

4. **Python Service Won't Start**
   - Verify Python 3.8+ is installed
   - Check virtual environment activation
   - Install requirements: `pip install -r requirements.txt`
