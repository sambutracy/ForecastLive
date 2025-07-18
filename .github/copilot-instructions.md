<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Forecast Live - F1 Prediction dApp

This is an Internet Computer Protocol (ICP) dApp for Formula 1 predictions with the following architecture:

## Tech Stack
- **Backend**: Motoko canister on ICP
- **Frontend**: React with TailwindCSS
- **Authentication**: NFID
- **Charts**: Chart.js with react-chartjs-2
- **File Upload**: react-dropzone

## Key Features
1. **User Authentication**: NFID-based authentication with Principal-based identity
2. **Prediction Upload**: Screenshot upload with mocked AI parsing
3. **On-chain Storage**: Predictions stored in Motoko canister
4. **Live Scoring**: Real-time score calculation based on F1 rules
5. **Race Simulation**: Mock race progression with lap-by-lap updates
6. **Leaderboard**: User rankings based on prediction accuracy

## Scoring Rules
- Exact position match: 100% of driver's points
- 1 position off: 50%
- 2 positions off: 25%
- 3 positions off: 12.5%
- More than 3 off: 0%

## File Structure
- `/src/forecast_live_backend/main.mo` - Motoko canister
- `/src/forecast_live_frontend/src/` - React frontend
- `/src/forecast_live_frontend/src/contexts/` - React contexts for auth and canister
- `/src/forecast_live_frontend/src/components/` - React components

## Development Notes
- Currently uses mock data for AI parsing and canister interactions
- NFID authentication is configured for development
- Race simulation uses predefined lap data
- All predictions are stored with Principal-based user identification
