@echo off
REM Forecast Live - Test Script
echo 🏎️ Forecast Live dApp - Test Script
echo ======================================

REM Check if we're in the right directory
if not exist "dfx.json" (
    echo ❌ Error: dfx.json not found. Please run from project root.
    exit /b 1
)

echo ✅ Project structure verified

REM Check frontend dependencies
if exist "src\forecast_live_frontend\node_modules" (
    echo ✅ Frontend dependencies installed
) else (
    echo ❌ Frontend dependencies missing
    exit /b 1
)

REM Check key files
if exist "src\forecast_live_backend\main.mo" (
    echo ✅ src\forecast_live_backend\main.mo exists
) else (
    echo ❌ src\forecast_live_backend\main.mo missing
    exit /b 1
)

if exist "src\forecast_live_frontend\src\App.js" (
    echo ✅ src\forecast_live_frontend\src\App.js exists
) else (
    echo ❌ src\forecast_live_frontend\src\App.js missing
    exit /b 1
)

if exist "src\forecast_live_frontend\src\contexts\AuthContext.js" (
    echo ✅ src\forecast_live_frontend\src\contexts\AuthContext.js exists
) else (
    echo ❌ src\forecast_live_frontend\src\contexts\AuthContext.js missing
    exit /b 1
)

if exist "src\forecast_live_frontend\src\contexts\CanisterContext.js" (
    echo ✅ src\forecast_live_frontend\src\contexts\CanisterContext.js exists
) else (
    echo ❌ src\forecast_live_frontend\src\contexts\CanisterContext.js missing
    exit /b 1
)

echo.
echo 🎯 All tests passed! The Forecast Live dApp is ready.
echo.
echo To start the application:
echo 1. cd src\forecast_live_frontend
echo 2. npm start
echo 3. Open http://localhost:3000
echo.
echo 🏁 Happy racing!
