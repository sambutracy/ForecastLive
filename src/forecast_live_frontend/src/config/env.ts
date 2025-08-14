/**
 * Environment Configuration
 * This file handles environment variables and configuration for different deployment contexts
 */

// Determine if we're in production based on NODE_ENV
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Determine if we're using local DFX network
const IS_LOCAL = process.env.DFX_NETWORK === 'local' || !IS_PRODUCTION;

// Default canister IDs for local development
const DEFAULT_LOCAL_CANISTER_IDS = {
  FORECAST_LIVE_BACKEND_CANISTER_ID: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
  AUTH_SERVICE_CANISTER_ID: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  INTERNET_IDENTITY_CANISTER_ID: 'rdmx6-jaaaa-aaaaa-aaadq-cai',
  F1_DATA_SERVICE_CANISTER_ID: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  PREDICTION_SERVICE_CANISTER_ID: 'r7inp-6aaaa-aaaaa-aaabq-cai',
  AI_PREDICTION_SERVICE_CANISTER_ID: 'renrk-eyaaa-aaaaa-aaada-cai',
};

// Get canister IDs from environment or use defaults
const getCanisterId = (name: string, defaultValue: string): string => {
  return (process.env as any)[name] || defaultValue;
};

// Define TypeScript interface for the environment
interface Environment {
  // Environment flags
  IS_PRODUCTION: boolean;
  IS_LOCAL: boolean;
  
  // Network configuration
  DFX_NETWORK: string;
  IC_HOST: string;
  
  // Canister IDs
  FORECAST_LIVE_BACKEND_CANISTER_ID: string;
  AUTH_SERVICE_CANISTER_ID: string;
  INTERNET_IDENTITY_CANISTER_ID: string;
  F1_DATA_SERVICE_CANISTER_ID: string;
  PREDICTION_SERVICE_CANISTER_ID: string;
  AI_PREDICTION_SERVICE_CANISTER_ID: string;
  
  // API and Service URLs
  API_URL: string;
  F1_DATA_SERVICE_URL: string;
  F1_DATA_SOCKET_URL: string;
  
  // Auth configuration
  II_CANISTER_ID: string;
  II_PROVIDER_URL: string;
  
  // Feature flags
  FEATURE_AI_PREDICTION: string;
  FEATURE_LIVE_RACE_TRACKER: string;
  FEATURE_SOCIAL_SHARING: string;
  FEATURE_LEADERBOARDS: string;
  FEATURE_PREDICTION_GROUPS: string;
  
  // Debug
  DEBUG: boolean;
}

const ENV: Environment = {
  // Environment flags
  IS_PRODUCTION,
  IS_LOCAL,
  
  // Network configuration
  DFX_NETWORK: (process.env as any).DFX_NETWORK || (IS_PRODUCTION ? 'ic' : 'local'),
  IC_HOST: IS_LOCAL
    ? (process.env as any).IC_HOST || 'http://localhost:8000'
    : 'https://ic0.app',
  
  // Canister IDs
  FORECAST_LIVE_BACKEND_CANISTER_ID: getCanisterId(
    'FORECAST_LIVE_BACKEND_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.FORECAST_LIVE_BACKEND_CANISTER_ID
  ),
  AUTH_SERVICE_CANISTER_ID: getCanisterId(
    'AUTH_SERVICE_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.AUTH_SERVICE_CANISTER_ID
  ),
  INTERNET_IDENTITY_CANISTER_ID: getCanisterId(
    'INTERNET_IDENTITY_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.INTERNET_IDENTITY_CANISTER_ID
  ),
  F1_DATA_SERVICE_CANISTER_ID: getCanisterId(
    'F1_DATA_SERVICE_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.F1_DATA_SERVICE_CANISTER_ID
  ),
  PREDICTION_SERVICE_CANISTER_ID: getCanisterId(
    'PREDICTION_SERVICE_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.PREDICTION_SERVICE_CANISTER_ID
  ),
  AI_PREDICTION_SERVICE_CANISTER_ID: getCanisterId(
    'AI_PREDICTION_SERVICE_CANISTER_ID',
    DEFAULT_LOCAL_CANISTER_IDS.AI_PREDICTION_SERVICE_CANISTER_ID
  ),
  
  // API and Service URLs
  API_URL: (process.env as any).API_URL || 'http://localhost:8080',
  F1_DATA_SERVICE_URL: (process.env as any).F1_DATA_SERVICE_URL || 'http://localhost:5000',
  F1_DATA_SOCKET_URL: (process.env as any).F1_DATA_SOCKET_URL || 'http://localhost:5000',
  
  // Auth configuration
  II_CANISTER_ID: (process.env as any).II_CANISTER_ID || DEFAULT_LOCAL_CANISTER_IDS.INTERNET_IDENTITY_CANISTER_ID,
  II_PROVIDER_URL: (process.env as any).II_PROVIDER_URL || 'https://identity.ic0.app',
  
  // Feature flags
  FEATURE_AI_PREDICTION: (process.env as any).FEATURE_AI_PREDICTION || 'false',
  FEATURE_LIVE_RACE_TRACKER: (process.env as any).FEATURE_LIVE_RACE_TRACKER || 'true',
  FEATURE_SOCIAL_SHARING: (process.env as any).FEATURE_SOCIAL_SHARING || 'false',
  FEATURE_LEADERBOARDS: (process.env as any).FEATURE_LEADERBOARDS || 'true',
  FEATURE_PREDICTION_GROUPS: (process.env as any).FEATURE_PREDICTION_GROUPS || 'false',
  
  // Debug
  DEBUG: IS_LOCAL || (process.env as any).DEBUG === 'true',
};

export default ENV;
