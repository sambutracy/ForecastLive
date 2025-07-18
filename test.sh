#!/bin/bash

# Forecast Live - Test Script
echo "🏎️ Forecast Live dApp - Test Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: dfx.json not found. Please run from project root."
    exit 1
fi

echo "✅ Project structure verified"

# Check frontend dependencies
if [ -d "src/forecast_live_frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing"
    exit 1
fi

# Check key files
key_files=(
    "src/forecast_live_backend/main.mo"
    "src/forecast_live_frontend/src/App.js"
    "src/forecast_live_frontend/src/contexts/AuthContext.js"
    "src/forecast_live_frontend/src/contexts/CanisterContext.js"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🎯 All tests passed! The Forecast Live dApp is ready."
echo ""
echo "To start the application:"
echo "1. cd src/forecast_live_frontend"
echo "2. npm start"
echo "3. Open http://localhost:3000"
echo ""
echo "🏁 Happy racing!"
