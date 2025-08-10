/**
 * Script to prepare environment variables for the frontend build
 * This extracts canister IDs from dfx-generated files and makes them available to webpack
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

console.log(`${colors.blue}🚀 Preparing frontend build environment...${colors.reset}`);

// Determine the network we're building for
const network = process.env.DFX_NETWORK || 'local';
const isProduction = network === 'ic';

console.log(`${isProduction 
  ? colors.green + 'Building for production (IC mainnet)' 
  : colors.yellow + 'Building for local development'
}${colors.reset}`);

// Paths to canister ID files
const rootDir = path.resolve(__dirname, '../..');
const canisterIdsFile = path.join(rootDir, 'canister_ids.json');
const localCanisterIdsFile = path.join(rootDir, 'canister_ids.local.json');

// Determine which canister IDs file to use
let canisterIdsPath;
if (network === 'local' && fs.existsSync(localCanisterIdsFile)) {
  canisterIdsPath = localCanisterIdsFile;
  console.log(`Using local canister IDs from ${localCanisterIdsFile}`);
} else if (fs.existsSync(canisterIdsFile)) {
  canisterIdsPath = canisterIdsFile;
  console.log(`Using canister IDs from ${canisterIdsFile}`);
} else {
  console.error(`${colors.red}Error: Canister IDs file not found!${colors.reset}`);
  console.log(`Expected at: ${canisterIdsFile}`);
  console.log(`Make sure to run 'dfx deploy' first to generate canister IDs`);

  // For development only, we'll provide fallback values
  if (!isProduction) {
    console.log(`${colors.yellow}Using fallback canister IDs for development${colors.reset}`);
    process.env.FORECAST_LIVE_BACKEND_CANISTER_ID = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
    
    console.log(`${colors.green}✅ Environment prepared with fallback values${colors.reset}`);
    return;
  }
  
  process.exit(1);
}

try {
  // Read the canister IDs file
  const canisterIdsJson = fs.readFileSync(canisterIdsPath, 'utf8');
  const canisterIds = JSON.parse(canisterIdsJson);
  
  // Extract the backend canister ID
  const backendCanisterId = canisterIds?.forecast_live_backend?.[network];
  
  if (!backendCanisterId) {
    console.error(`${colors.red}Error: Could not find forecast_live_backend canister ID for network ${network}${colors.reset}`);
    process.exit(1);
  }
  
  // Set the environment variables
  process.env.FORECAST_LIVE_BACKEND_CANISTER_ID = backendCanisterId;
  
  console.log(`Backend Canister ID: ${colors.green}${backendCanisterId}${colors.reset}`);
  console.log(`${colors.green}✅ Environment prepared successfully${colors.reset}`);
  
} catch (error) {
  console.error(`${colors.red}Error reading canister IDs file: ${error.message}${colors.reset}`);
  process.exit(1);
}
