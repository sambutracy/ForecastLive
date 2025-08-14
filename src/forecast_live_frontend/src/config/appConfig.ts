/**
 * Application Configuration
 * This file contains all the configuration settings for the Forecast Live F1 Prediction dApp
 */
import ENV from './env';

const appConfig = {
  // Authentication settings
  auth: {
    nfid: {
      applicationName: 'Forecast Live',
      applicationLogo: 'https://via.placeholder.com/150x150.png?text=FL', // Use a placeholder logo for now
      redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
      host: 'https://nfid.one',
      derivationOrigin: 'https://identity.ic0.app',
      buttonStyle: 'black', // Other options: 'white', 'outline'
      loginLabel: 'Continue with NFID', // Custom label for login button
    },
    // Adding proper Internet Identity config
    internetIdentity: {
      canisterId: ENV.II_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai',
      providerUrl: ENV.II_PROVIDER_URL || 'https://identity.ic0.app',
      windowOpenerFeatures: 'toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100',
    },
    sessionDuration: 8 * 60 * 60 * 1000 * 1000 * 1000, // 8 hours in nanoseconds
  },
  
  // API endpoints
  api: {
    baseUrl: ENV.API_URL || 'http://localhost:8080',
    endpoints: {
      auth: '/auth',
      profile: '/profile',
      predictions: '/predictions',
      results: '/results',
      leaderboard: '/leaderboard',
    },
  },
  
  // F1 Data Service
  f1Data: {
    serviceUrl: ENV.F1_DATA_SERVICE_URL || 'http://localhost:5000',
    socketUrl: ENV.F1_DATA_SOCKET_URL || 'http://localhost:5000',
    endpoints: {
      schedule: '/schedule',
      races: '/races',
      drivers: '/drivers',
      teams: '/teams',
      results: '/results',
      liveData: '/live',
      ocr: '/ocr/predict',
    },
    pollingInterval: 10000, // ms
  },
  
// Internet Computer settings
ic: {
    host: ENV.IC_HOST || 'http://localhost:8000',
    canisterIds: {
        authService: ENV.AUTH_SERVICE_CANISTER_ID || 'rkp4c-7iaaa-aaaaa-aaaca-cai',
        forecastLiveBackend: ENV.FORECAST_LIVE_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai',
        f1DataService: ENV.F1_DATA_SERVICE_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai',
        predictionService: ENV.PREDICTION_SERVICE_CANISTER_ID || 'r7inp-6aaaa-aaaaa-aaabq-cai',
        aiPredictionService: ENV.AI_PREDICTION_SERVICE_CANISTER_ID || 'renrk-eyaaa-aaaaa-aaada-cai',
    },
},

  // UI Configuration
  ui: {
    theme: 'dark', // 'dark' or 'light'
    accentColor: '#ff0000', // F1 red
    dateFormat: 'DD MMM YYYY',
    timeFormat: 'HH:mm',
    defaultAvatar: 'https://via.placeholder.com/150x150.png?text=FL',
    maxFileSize: 5 * 1024 * 1024, // 5MB for image uploads
  },
  
  // Feature flags
  features: {
    aiPredictionEnabled: ENV.FEATURE_AI_PREDICTION === 'true' || false,
    liveRaceTrackerEnabled: ENV.FEATURE_LIVE_RACE_TRACKER === 'true' || true,
    socialSharingEnabled: ENV.FEATURE_SOCIAL_SHARING === 'true' || false,
    leaderboardsEnabled: ENV.FEATURE_LEADERBOARDS === 'true' || true,
    predictionGroupsEnabled: ENV.FEATURE_PREDICTION_GROUPS === 'true' || false,
  },
  
  // Get convenience properties
  get API_URL() {
    return this.api.baseUrl;
  },
  
  get F1_DATA_SERVICE_URL() {
    return this.f1Data.serviceUrl;
  },
  
  get F1_DATA_SOCKET_URL() {
    return this.f1Data.socketUrl;
  },
  
  get AUTH_SERVICE_ID() {
    return this.ic.canisterIds.authService;
  },
  
  get BACKEND_CANISTER_ID() {
    return this.ic.canisterIds.forecastLiveBackend;
  },
  
  get IC_HOST() {
    return this.ic.host;
  }
};

export default appConfig;
