/**
 * Environment configuration for the frontend
 * This file provides a centralized place for handling environment-specific configuration
 * and avoids direct use of process.env in the browser environment
 */

// This file is automatically processed by webpack to replace any references
// to process.env with the appropriate values from the build environment

const ENV = {
  // Environment type
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: (process.env.NODE_ENV === 'production'),
  
  // Network configuration
  DFX_NETWORK: process.env.DFX_NETWORK || 'local',
  
  // Canister IDs
  FORECAST_LIVE_BACKEND_CANISTER_ID: process.env.FORECAST_LIVE_BACKEND_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai',
  
  // Host configuration
  IC_HOST: process.env.NODE_ENV === 'production' ? 'https://ic0.app' : 'http://localhost:8000'
};

export default ENV;
