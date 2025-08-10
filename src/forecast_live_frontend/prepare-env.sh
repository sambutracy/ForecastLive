#!/bin/bash

# Script to prepare environment for building the frontend
# This extracts canister IDs from the dfx-generated files and sets them as environment variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Preparing frontend build environment..."

# Determine if we're in a production environment
if [ "$DFX_NETWORK" == "ic" ]; then
  NETWORK="ic"
  echo -e "${GREEN}Building for production (IC mainnet)${NC}"
else
  NETWORK="local"
  echo -e "${YELLOW}Building for local development${NC}"
fi

# Path to the canister_ids.json file
CANISTER_IDS_FILE="./canister_ids.json"
LOCAL_CANISTER_IDS_FILE="./canister_ids.local.json"

# Check if we should use local or network canister IDs
if [ "$NETWORK" == "local" ] && [ -f "$LOCAL_CANISTER_IDS_FILE" ]; then
  CANISTER_IDS_FILE=$LOCAL_CANISTER_IDS_FILE
  echo "Using local canister IDs from $LOCAL_CANISTER_IDS_FILE"
elif [ -f "$CANISTER_IDS_FILE" ]; then
  echo "Using canister IDs from $CANISTER_IDS_FILE"
else
  echo -e "${RED}Error: Canister IDs file not found at $CANISTER_IDS_FILE${NC}"
  echo "Make sure to run 'dfx deploy' first to generate canister IDs"
  exit 1
fi

# Extract the forecast_live_backend canister ID
if [ "$NETWORK" == "local" ]; then
  # For local development
  FORECAST_LIVE_BACKEND_CANISTER_ID=$(cat "$CANISTER_IDS_FILE" | grep -o '"forecast_live_backend": {"local": "[^"]*' | sed 's/"forecast_live_backend": {"local": "//')
else
  # For production (IC network)
  FORECAST_LIVE_BACKEND_CANISTER_ID=$(cat "$CANISTER_IDS_FILE" | grep -o '"forecast_live_backend": {"ic": "[^"]*' | sed 's/"forecast_live_backend": {"ic": "//')
fi

# Check if we got a valid canister ID
if [ -z "$FORECAST_LIVE_BACKEND_CANISTER_ID" ]; then
  echo -e "${RED}Error: Could not extract forecast_live_backend canister ID${NC}"
  exit 1
fi

echo -e "Backend Canister ID: ${GREEN}$FORECAST_LIVE_BACKEND_CANISTER_ID${NC}"

# Export the environment variables
export FORECAST_LIVE_BACKEND_CANISTER_ID="$FORECAST_LIVE_BACKEND_CANISTER_ID"
export DFX_NETWORK="$NETWORK"

echo "✅ Environment prepared for frontend build"
echo "Run 'npm run build' to build the frontend with these settings"
