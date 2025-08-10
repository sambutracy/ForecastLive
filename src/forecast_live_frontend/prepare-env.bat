@echo off
REM Script to prepare environment for building the frontend
REM This extracts canister IDs from the dfx-generated files and sets them as environment variables

echo [94m🚀 Preparing frontend build environment...[0m

REM Determine if we're in a production environment
if "%DFX_NETWORK%"=="ic" (
  set NETWORK=ic
  echo [92mBuilding for production (IC mainnet)[0m
) else (
  set NETWORK=local
  echo [93mBuilding for local development[0m
)

REM Path to the canister_ids.json file
set CANISTER_IDS_FILE=.\canister_ids.json
set LOCAL_CANISTER_IDS_FILE=.\canister_ids.local.json

REM Check if we should use local or network canister IDs
if "%NETWORK%"=="local" if exist "%LOCAL_CANISTER_IDS_FILE%" (
  set CANISTER_IDS_FILE=%LOCAL_CANISTER_IDS_FILE%
  echo Using local canister IDs from %LOCAL_CANISTER_IDS_FILE%
) else if exist "%CANISTER_IDS_FILE%" (
  echo Using canister IDs from %CANISTER_IDS_FILE%
) else (
  echo [91mError: Canister IDs file not found at %CANISTER_IDS_FILE%[0m
  echo Make sure to run 'dfx deploy' first to generate canister IDs
  exit /b 1
)

REM For Windows, we'll use a small PowerShell script to extract the JSON values
REM This is a simple approach - you might want to use a JSON parser for more complex scenarios

echo Extracting canister IDs...

if "%NETWORK%"=="local" (
  REM For local development - extract from local section
  for /f "tokens=*" %%i in ('powershell -command "Get-Content '%CANISTER_IDS_FILE%' | ConvertFrom-Json | Select-Object -ExpandProperty forecast_live_backend | Select-Object -ExpandProperty local"') do (
    set FORECAST_LIVE_BACKEND_CANISTER_ID=%%i
  )
) else (
  REM For production (IC network) - extract from ic section
  for /f "tokens=*" %%i in ('powershell -command "Get-Content '%CANISTER_IDS_FILE%' | ConvertFrom-Json | Select-Object -ExpandProperty forecast_live_backend | Select-Object -ExpandProperty ic"') do (
    set FORECAST_LIVE_BACKEND_CANISTER_ID=%%i
  )
)

REM Check if we got a valid canister ID
if "%FORECAST_LIVE_BACKEND_CANISTER_ID%"=="" (
  echo [91mError: Could not extract forecast_live_backend canister ID[0m
  exit /b 1
)

echo Backend Canister ID: [92m%FORECAST_LIVE_BACKEND_CANISTER_ID%[0m

REM Set the environment variables
set FORECAST_LIVE_BACKEND_CANISTER_ID=%FORECAST_LIVE_BACKEND_CANISTER_ID%
set DFX_NETWORK=%NETWORK%

echo [92m✅ Environment prepared for frontend build[0m
echo Run 'npm run build' to build the frontend with these settings
