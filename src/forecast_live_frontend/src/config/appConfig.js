/**
 * Application Configuration
 * This file contains all the configuration settings for the Forecast Live F1 Prediction dApp
 */

const appConfig = {
  // Authentication settings
  auth: {
    useMockAuth: false, // Set to false to use real authentication
    nfid: {
      applicationName: 'Forecast Live',
      applicationLogo: 'https://nfid.one/icons/favicon-96x96.png', 
      // Development local URI 
      redirectUri: 'http://localhost:8080/', // Match webpack-dev-server port
      // NFID configuration
      host: 'https://nfid.one',
      derivationOrigin: 'https://identity.ic0.app',
    },
  },
  
  // API endpoints
  api: {
    // Internet Computer host
    host: 'https://ic0.app', // IC mainnet
    // Alternative options:
    // 'https://icp0.io' - Alternative IC mainnet
    // 'http://localhost:8000' - Local replica
    
    // Flag to fetch root key (needed for local development)
    fetchRootKey: true, // Set to false for production
    
    // F1 Data Service API endpoint
    f1DataService: 'http://localhost:5000/api',
    
    // Socket.io endpoint for live race data
    socket: 'http://localhost:5000',
    
    // Canister IDs for ICP deployment
    canisters: {
      // Local development canister IDs
      local: {
        forecast_live_backend: 'rrkah-fqaaa-aaaaa-aaaaq-cai', // Local canister ID
      },
      // Production canister IDs
      ic: {
        forecast_live_backend: 'utozz-siaaa-aaaam-qaaxq-cai', // Replace with actual production canister ID when deployed
      }
    },
  },
  
  // F1 data configuration
  f1Data: {
    // For the demo, we'll use the mock data
    useMockData: true,
    defaultRace: 'Monaco Grand Prix',
    // List of drivers for the current season
    drivers: [
      { code: 'VER', name: 'Max Verstappen', team: 'Red Bull Racing' },
      { code: 'PER', name: 'Sergio Perez', team: 'Red Bull Racing' },
      { code: 'HAM', name: 'Lewis Hamilton', team: 'Mercedes' },
      { code: 'RUS', name: 'George Russell', team: 'Mercedes' },
      { code: 'LEC', name: 'Charles Leclerc', team: 'Ferrari' },
      { code: 'SAI', name: 'Carlos Sainz', team: 'Ferrari' },
      { code: 'NOR', name: 'Lando Norris', team: 'McLaren' },
      { code: 'PIA', name: 'Oscar Piastri', team: 'McLaren' },
      { code: 'ALO', name: 'Fernando Alonso', team: 'Aston Martin' },
      { code: 'STR', name: 'Lance Stroll', team: 'Aston Martin' },
      { code: 'GAS', name: 'Pierre Gasly', team: 'Alpine' },
      { code: 'OCO', name: 'Esteban Ocon', team: 'Alpine' },
      { code: 'HUL', name: 'Nico Hulkenberg', team: 'Haas F1 Team' },
      { code: 'MAG', name: 'Kevin Magnussen', team: 'Haas F1 Team' },
      { code: 'TSU', name: 'Yuki Tsunoda', team: 'RB' },
      { code: 'RIC', name: 'Daniel Ricciardo', team: 'RB' },
      { code: 'BOT', name: 'Valtteri Bottas', team: 'Kick Sauber' },
      { code: 'ZHO', name: 'Guanyu Zhou', team: 'Kick Sauber' },
      { code: 'ALB', name: 'Alexander Albon', team: 'Williams' },
      { code: 'SAR', name: 'Logan Sargeant', team: 'Williams' },
    ],
  },

  // Scoring system configuration
  scoring: {
    // F1 points system
    pointsSystem: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    
    // Prediction accuracy multipliers
    accuracyMultipliers: {
      exactMatch: 1.0,    // Exact position match
      oneOff: 0.5,        // One position off
      twoOff: 0.25,       // Two positions off
      threeOff: 0.125,    // Three positions off
      moreThanThree: 0.0  // More than three positions off
    },
  },
};

export default appConfig;
