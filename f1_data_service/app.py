import os
import json
import threading
import schedule
import time
import io
import base64
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import logging

import fastf1
import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests
from werkzeug.utils import secure_filename

# Import our OCR processor
from ocr_processor import OCRPredictionProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'f1-live-data-secret'
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
CORS(app, origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:8000"])
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:8000"])

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure FastF1 cache
fastf1.Cache.enable_cache('./fastf1_cache')

# Initialize OCR processor
ocr_processor = OCRPredictionProcessor()

class F1LiveDataService:
    def __init__(self):
        self.current_session = None
        self.live_timing_data = {}
        self.race_schedule = []
        self.session_results = {}
        self.ergast_base_url = "http://ergast.com/api/f1"
        
        # Initialize with current season schedule
        self.load_race_schedule()
        
    def load_race_schedule(self):
        """Load the current season's race schedule"""
        try:
            current_year = datetime.now().year
            schedule_df = fastf1.get_event_schedule(current_year)
            
            self.race_schedule = []
            for _, event in schedule_df.iterrows():
                event_data = {
                    'round': int(event.get('RoundNumber', 0)),
                    'raceName': event.get('EventName', 'Unknown'),
                    'circuitName': event.get('Location', 'Unknown'),
                    'country': event.get('Country', 'Unknown'),
                    'date': event.get('EventDate', '').strftime('%Y-%m-%d') if pd.notna(event.get('EventDate')) else '',
                    'time': event.get('Session5DateUtc', '').strftime('%H:%M:%S') if pd.notna(event.get('Session5DateUtc')) else '',
                    'sessions': self._get_session_times(event)
                }
                self.race_schedule.append(event_data)
                
            logger.info(f"Loaded {len(self.race_schedule)} races for {current_year}")
            
        except Exception as e:
            logger.error(f"Error loading race schedule: {str(e)}")
            # Fallback schedule for testing
            self.race_schedule = self._get_fallback_schedule()
    
    def _get_session_times(self, event) -> Dict[str, str]:
        """Extract session times from event data"""
        sessions = {}
        session_mapping = {
            'Session1DateUtc': 'practice1',
            'Session2DateUtc': 'practice2', 
            'Session3DateUtc': 'practice3',
            'Session4DateUtc': 'qualifying',
            'Session5DateUtc': 'race'
        }
        
        for session_key, session_name in session_mapping.items():
            session_time = event.get(session_key)
            if pd.notna(session_time):
                sessions[session_name] = session_time.strftime('%Y-%m-%d %H:%M:%S')
                
        return sessions
    
    def _get_fallback_schedule(self) -> List[Dict]:
        """Fallback race schedule for testing"""
        return [
            {
                'round': 1,
                'raceName': 'Bahrain Grand Prix',
                'circuitName': 'Bahrain International Circuit',
                'country': 'Bahrain',
                'date': '2024-03-02',
                'time': '15:00:00',
                'sessions': {
                    'practice1': '2024-03-01 11:30:00',
                    'practice2': '2024-03-01 15:00:00',
                    'practice3': '2024-03-02 11:30:00',
                    'qualifying': '2024-03-02 15:00:00',
                    'race': '2024-03-03 15:00:00'
                }
            }
        ]
    
    def get_current_race_weekend(self) -> Optional[Dict]:
        """Get the current race weekend based on date"""
        now = datetime.now()
        
        for race in self.race_schedule:
            race_date = datetime.strptime(race['date'], '%Y-%m-%d')
            # Consider a race weekend as current if it's within 4 days
            if abs((race_date - now).days) <= 4:
                return race
        
        return None
    
    def get_live_session_data(self, year: int, gp_name: str, session_type: str) -> Dict:
        """Get live session data using FastF1"""
        try:
            session = fastf1.get_session(year, gp_name, session_type)
            session.load()
            
            # Get driver standings for this session
            results = []
            if hasattr(session, 'results') and session.results is not None:
                for _, driver in session.results.iterrows():
                    result = {
                        'position': int(driver.get('Position', 0)) if pd.notna(driver.get('Position')) else None,
                        'driverCode': driver.get('Abbreviation', 'UNK'),
                        'driverName': f"{driver.get('FirstName', '')} {driver.get('LastName', '')}".strip(),
                        'team': driver.get('TeamName', 'Unknown'),
                        'time': str(driver.get('Time', '')) if pd.notna(driver.get('Time')) else None,
                        'status': driver.get('Status', 'Unknown'),
                        'points': int(driver.get('Points', 0)) if pd.notna(driver.get('Points')) else 0
                    }
                    results.append(result)
            
            # Get lap data for live timing simulation
            laps_data = []
            if hasattr(session, 'laps') and session.laps is not None:
                latest_laps = session.laps.groupby('Driver').last()
                for driver_code, lap in latest_laps.iterrows():
                    lap_data = {
                        'driverCode': driver_code,
                        'lapNumber': int(lap.get('LapNumber', 0)),
                        'lapTime': str(lap.get('LapTime', '')) if pd.notna(lap.get('LapTime')) else None,
                        'sector1Time': str(lap.get('Sector1Time', '')) if pd.notna(lap.get('Sector1Time')) else None,
                        'sector2Time': str(lap.get('Sector2Time', '')) if pd.notna(lap.get('Sector2Time')) else None,
                        'sector3Time': str(lap.get('Sector3Time', '')) if pd.notna(lap.get('Sector3Time')) else None,
                        'compound': lap.get('Compound', 'Unknown'),
                        'position': int(lap.get('Position', 0)) if pd.notna(lap.get('Position')) else None
                    }
                    laps_data.append(lap_data)
            
            return {
                'sessionType': session_type,
                'sessionStatus': 'Finished' if session.session_status else 'Live',
                'totalLaps': len(session.laps.groupby('LapNumber')) if hasattr(session, 'laps') else 0,
                'currentLap': max(session.laps['LapNumber']) if hasattr(session, 'laps') and len(session.laps) > 0 else 0,
                'results': results,
                'liveTimingData': laps_data,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting live session data: {str(e)}")
            return self._get_mock_live_data()
    
    def _get_mock_live_data(self) -> Dict:
        """Generate mock live race data for testing"""
        drivers = [
            {'code': 'VER', 'name': 'Max Verstappen', 'team': 'Red Bull Racing'},
            {'code': 'HAM', 'name': 'Lewis Hamilton', 'team': 'Mercedes'},
            {'code': 'LEC', 'name': 'Charles Leclerc', 'team': 'Ferrari'},
            {'code': 'RUS', 'name': 'George Russell', 'team': 'Mercedes'},
            {'code': 'SAI', 'name': 'Carlos Sainz', 'team': 'Ferrari'},
            {'code': 'NOR', 'name': 'Lando Norris', 'team': 'McLaren'},
            {'code': 'PIA', 'name': 'Oscar Piastri', 'team': 'McLaren'},
            {'code': 'ALO', 'name': 'Fernando Alonso', 'team': 'Aston Martin'},
            {'code': 'STR', 'name': 'Lance Stroll', 'team': 'Aston Martin'},
            {'code': 'GAS', 'name': 'Pierre Gasly', 'team': 'Alpine'}
        ]
        
        results = []
        for i, driver in enumerate(drivers):
            results.append({
                'position': i + 1,
                'driverCode': driver['code'],
                'driverName': driver['name'],
                'team': driver['team'],
                'time': f"1:{25 + i}.{123 + i*50:03d}" if i > 0 else "1:25.123",
                'status': 'Running',
                'points': max(25 - i * 2, 0) if i < 10 else 0
            })
        
        return {
            'sessionType': 'Race',
            'sessionStatus': 'Live',
            'totalLaps': 57,
            'currentLap': 42,
            'results': results,
            'liveTimingData': results,
            'timestamp': datetime.now().isoformat()
        }

# Initialize the service
f1_service = F1LiveDataService()

# API Routes
@app.route('/api/schedule', methods=['GET'])
def get_race_schedule():
    """Get the current season's race schedule"""
    return jsonify({
        'success': True,
        'data': f1_service.race_schedule
    })

@app.route('/api/current-race', methods=['GET'])
def get_current_race():
    """Get the current race weekend information"""
    current_race = f1_service.get_current_race_weekend()
    return jsonify({
        'success': True,
        'data': current_race
    })

@app.route('/api/live-data', methods=['GET'])
def get_live_data():
    """Get live race data"""
    year = request.args.get('year', datetime.now().year, type=int)
    gp_name = request.args.get('gp', 'Bahrain')  # Default for testing
    session_type = request.args.get('session', 'Race')
    
    live_data = f1_service.get_live_session_data(year, gp_name, session_type)
    return jsonify({
        'success': True,
        'data': live_data
    })

@app.route('/api/session-results/<int:year>/<gp_name>/<session_type>', methods=['GET'])
def get_session_results(year: int, gp_name: str, session_type: str):
    """Get results for a specific session"""
    try:
        session_data = f1_service.get_live_session_data(year, gp_name, session_type)
        return jsonify({
            'success': True,
            'data': session_data
        })
    except Exception as e:
        logger.error(f"Error getting session results: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# OCR Processing Endpoints
@app.route('/ocr/predict', methods=['POST'])
def process_prediction_image():
    """Process an F1 prediction image using OCR"""
    if 'image' not in request.files:
        return jsonify({
            'status': 'error',
            'error': 'No image file provided'
        }), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({
            'status': 'error',
            'error': 'No selected file'
        }), 400
    
    # Get additional metadata
    user_id = request.form.get('userId', 'anonymous')
    
    try:
        # Read the file
        file_content = file.read()
        
        # Generate a unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}_{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the file for record-keeping
        with open(filepath, 'wb') as f:
            f.write(file_content)
        
        # Process the image
        result = ocr_processor.process_image_bytes(file_content)
        
        # Add metadata to result
        result['userId'] = user_id
        result['timestamp'] = datetime.now().isoformat()
        result['filename'] = filename
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/ocr/images/<filename>', methods=['GET'])
def get_processed_image(filename):
    """Get a processed OCR image"""
    try:
        return send_file(
            os.path.join(app.config['UPLOAD_FOLDER'], filename),
            mimetype='image/jpeg'
        )
    except Exception as e:
        logger.error(f"Error retrieving image: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 404

# WebSocket events for real-time updates
@socketio.on('connect')
def handle_connect():
    logger.info('Client connected to live timing')
    emit('connected', {'data': 'Connected to F1 Live Timing'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected from live timing')

@socketio.on('subscribe_live_timing')
def handle_subscribe_live_timing(data):
    """Subscribe to live timing updates"""
    logger.info(f"Client subscribed to live timing: {data}")
    
    # Send initial data
    current_race = f1_service.get_current_race_weekend()
    if current_race:
        live_data = f1_service.get_live_session_data(
            datetime.now().year, 
            current_race['raceName'], 
            'Race'
        )
        emit('live_timing_update', live_data)

def broadcast_live_updates():
    """Broadcast live timing updates to all connected clients"""
    try:
        current_race = f1_service.get_current_race_weekend()
        if current_race:
            live_data = f1_service.get_live_session_data(
                datetime.now().year,
                current_race['raceName'],
                'Race'
            )
            socketio.emit('live_timing_update', live_data)
            logger.info("Broadcasted live timing update")
    except Exception as e:
        logger.error(f"Error broadcasting live updates: {str(e)}")

# Schedule live updates every 30 seconds during race weekends
def schedule_live_updates():
    """Schedule periodic live data updates"""
    schedule.every(30).seconds.do(broadcast_live_updates)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

# Start background scheduler
scheduler_thread = threading.Thread(target=schedule_live_updates, daemon=True)
scheduler_thread.start()

if __name__ == '__main__':
    logger.info("Starting F1 Live Data Service...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
