# F1 Live Data Service

A Python-based REST API service that provides real-time Formula 1 data using the Fast-F1 library and Ergast API.

## Features

- **Real-time Race Data**: Live timing, positions, and lap data during race weekends
- **Race Schedule**: Current season's complete race schedule with session times
- **Session Results**: Detailed results for Practice, Qualifying, and Race sessions
- **WebSocket Support**: Real-time updates via WebSocket connections
- **Ergast API Integration**: Historical F1 data access
- **Caching**: Intelligent caching for improved performance

## Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. **Run the setup script:**

   **Windows:**
   ```cmd
   setup.bat
   ```

   **Linux/Mac:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Manual setup (alternative):**
   ```bash
   # Create virtual environment
   python -m venv venv
   
   # Activate virtual environment
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

## Usage

### Starting the Service

1. **Activate virtual environment:**
   ```bash
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```

2. **Run the service:**
   ```bash
   python app.py
   ```

The service will start at `http://localhost:5000`

### API Endpoints

#### Get Race Schedule
```http
GET /api/schedule
```

Returns the current season's race schedule with dates and session times.

#### Get Current Race Weekend
```http
GET /api/current-race
```

Returns information about the current race weekend (within 4 days of race date).

#### Get Live Race Data
```http
GET /api/live-data?year=2024&gp=Bahrain&session=Race
```

Parameters:
- `year`: Season year (default: current year)
- `gp`: Grand Prix name (default: Bahrain)
- `session`: Session type (Practice1, Practice2, Practice3, Qualifying, Race)

#### Get Session Results
```http
GET /api/session-results/{year}/{gp_name}/{session_type}
```

Example: `GET /api/session-results/2024/Bahrain/Race`

### WebSocket Events

Connect to WebSocket at `ws://localhost:5000` for real-time updates:

- **connect**: Establish connection
- **subscribe_live_timing**: Subscribe to live timing updates
- **live_timing_update**: Receive real-time race data

## Data Sources

### Fast-F1 Library
- Official F1 timing data (2018-present)
- Telemetry and session information
- Real-time data during race weekends

### Ergast API
- Historical F1 data (1950-present)
- Race results, driver standings, constructor information
- Fallback data source

## Configuration

Edit `.env` file to configure:

- `FLASK_ENV`: Development/production environment
- `UPDATE_INTERVAL_SECONDS`: How often to update live data (default: 30s)
- `RACE_WEEKEND_DAYS_THRESHOLD`: Days around race date to consider "current" (default: 4)
- `ALLOWED_ORIGINS`: CORS allowed origins for frontend

## Cache Management

Fast-F1 caches data locally in `./fastf1_cache/` directory for performance. 

- Cache is automatically managed
- Improves response times for repeated requests
- Safe to delete if storage space is needed

## Troubleshooting

### Common Issues

1. **Python version error**: Ensure Python 3.8+ is installed
2. **Package installation fails**: Try upgrading pip: `pip install --upgrade pip`
3. **No live data**: Service uses mock data when real F1 data is unavailable
4. **CORS errors**: Check ALLOWED_ORIGINS in .env file

### Logs

The service logs important information to console:
- API requests and responses
- Data fetching status
- Error messages and stack traces

## Development

### Project Structure
```
f1_data_service/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── .env               # Configuration file
├── setup.bat          # Windows setup script
├── setup.sh           # Linux/Mac setup script
└── README.md          # This file
```

### Adding New Endpoints

1. Add route function in `app.py`
2. Implement data fetching logic in `F1LiveDataService` class
3. Test with sample requests
4. Update documentation

## License

MIT License - see project root for details

## Support

For issues related to:
- **Fast-F1 data**: Check [Fast-F1 documentation](https://docs.fastf1.dev/)
- **Ergast API**: Visit [Ergast website](http://ergast.com/mrd/)
- **This service**: Create an issue in the project repository
