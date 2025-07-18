@echo off
REM Start script for F1 Live Data Service

echo 🏁 Starting F1 Live Data Service...
echo.

set PYTHON_PATH="C:\Users\Victor Sambu\AppData\Local\Microsoft\WindowsApps\python.exe"

echo Testing dependencies...
%PYTHON_PATH% test_dependencies.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ Dependency test failed. Please install packages first:
    echo    setup_simple.bat
    pause
    exit /b 1
)

echo.
echo 🚀 Starting service on http://localhost:5000
echo Press Ctrl+C to stop the service
echo.

REM Change to the service directory
cd /d "D:\Forecastlive\f1_data_service"

REM Start the service
%PYTHON_PATH% app.py
