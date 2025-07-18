@echo off
REM F1 Live Data Service Simple Setup Script for Windows

echo 🏁 Setting up F1 Live Data Service...
echo.

set PYTHON_PATH="C:\Users\Victor Sambu\AppData\Local\Microsoft\WindowsApps\python.exe"

REM Check if Python works
%PYTHON_PATH% --version
if %errorlevel% neq 0 (
    echo Error: Python not found at expected location.
    echo Please ensure Python is installed and try again.
    pause
    exit /b 1
)

echo ✅ Python found and working!
echo.

REM Install packages directly
echo 📦 Installing F1 data service dependencies...
%PYTHON_PATH% -m pip install --user --upgrade pip
%PYTHON_PATH% -m pip install --user fastf1 flask flask-cors flask-socketio requests pandas python-socketio eventlet python-dotenv schedule

if %errorlevel% neq 0 (
    echo ❌ Error installing packages. 
    echo Try running as administrator or check your internet connection.
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 🚀 To start the F1 Live Data Service:
echo    start_service.bat
echo.
echo Or manually run:
echo    %PYTHON_PATH% app.py
echo.
echo The service will be available at http://localhost:5000
echo.
pause
