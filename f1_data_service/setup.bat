@echo off
REM F1 Live Data Service Setup Script for Windows

echo Setting up F1 Live Data Service...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed. Please install Python 3.8 or higher.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo Python version: %python_version%

echo.
echo Attempting to create virtual environment...

REM Remove existing venv if corrupted
if exist venv (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

REM Try to create virtual environment
python -m venv venv
if %errorlevel% neq 0 (
    echo Warning: Virtual environment creation failed.
    echo Installing packages globally instead...
    goto :install_global
)

REM Check if activation script exists
if not exist "venv\Scripts\activate.bat" (
    echo Warning: Virtual environment incomplete.
    echo Installing packages globally instead...
    goto :install_global
)

REM Activate virtual environment and install
echo Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo Warning: Virtual environment activation failed.
    echo Installing packages globally instead...
    goto :install_global
)

echo Installing dependencies in virtual environment...
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error installing packages in virtual environment.
    echo Installing packages globally instead...
    goto :install_global
)

echo.
echo ✅ Setup complete with virtual environment!
echo.
echo To start the F1 Live Data Service:
echo 1. Activate the virtual environment:
echo    venv\Scripts\activate.bat
echo 2. Run the service:
echo    python app.py
echo.
echo The service will be available at http://localhost:5000
goto :end

:install_global
echo.
echo Installing dependencies globally...
python -m pip install --upgrade pip --user
python -m pip install -r requirements.txt --user
if %errorlevel% neq 0 (
    echo Error: Failed to install packages. Please check your Python installation.
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete with global installation!
echo.
echo To start the F1 Live Data Service:
echo    python app.py
echo.
echo The service will be available at http://localhost:5000

:end
pause
