#!/usr/bin/env python3
"""
Test script for F1 Live Data Service
Tests API endpoints and data functionality
"""

import requests
import json
import time
from datetime import datetime

F1_SERVICE_URL = 'http://localhost:5000'

def test_endpoint(endpoint, description):
    """Test a specific API endpoint"""
    print(f"\n🧪 Testing {description}")
    print(f"   Endpoint: {endpoint}")
    
    try:
        response = requests.get(f"{F1_SERVICE_URL}{endpoint}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {response.status_code} OK")
            
            if data.get('success'):
                print(f"   ✅ Response: Success")
                
                # Print some sample data
                if 'data' in data and data['data']:
                    if isinstance(data['data'], list):
                        print(f"   📊 Data: {len(data['data'])} items returned")
                        if len(data['data']) > 0:
                            print(f"   📝 Sample: {str(data['data'][0])[:100]}...")
                    elif isinstance(data['data'], dict):
                        print(f"   📊 Data: {len(data['data'])} fields returned")
                        print(f"   📝 Keys: {list(data['data'].keys())}")
                    else:
                        print(f"   📊 Data: {data['data']}")
                else:
                    print(f"   ⚠️  No data returned")
            else:
                print(f"   ❌ Response: Failed - {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Status: {response.status_code} - {response.text[:100]}")
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection: Failed to connect to {F1_SERVICE_URL}")
        print(f"   💡 Make sure the F1 data service is running")
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout: Request took longer than 10 seconds")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

def test_websocket():
    """Test WebSocket connection (basic check)"""
    print(f"\n🔌 Testing WebSocket Connection")
    print(f"   URL: ws://localhost:5000")
    
    try:
        # Try to connect to the socketio endpoint
        response = requests.get(f"{F1_SERVICE_URL}/socket.io/", timeout=5)
        if response.status_code in [200, 400]:  # 400 is normal for HTTP request to WS endpoint
            print(f"   ✅ WebSocket endpoint available")
        else:
            print(f"   ⚠️  WebSocket endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ WebSocket test failed: {str(e)}")

def main():
    """Run all tests"""
    print("🏁 F1 Live Data Service Test Suite")
    print("=" * 50)
    print(f"Service URL: {F1_SERVICE_URL}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    # Test all endpoints
    test_endpoint('/api/schedule', 'Race Schedule')
    test_endpoint('/api/current-race', 'Current Race Weekend')
    test_endpoint('/api/live-data', 'Live Race Data (default)')
    test_endpoint('/api/live-data?year=2024&gp=Bahrain&session=Race', 'Live Race Data (Bahrain 2024)')
    test_endpoint('/api/session-results/2024/Bahrain/Race', 'Session Results')
    
    # Test WebSocket
    test_websocket()
    
    print("\n" + "=" * 50)
    print("🏁 Test Suite Complete")
    print("\n💡 If tests fail:")
    print("   1. Make sure F1 data service is running: python app.py")
    print("   2. Check that you're in the f1_data_service directory")
    print("   3. Verify virtual environment is activated")
    print("   4. Install requirements: pip install -r requirements.txt")

if __name__ == "__main__":
    main()
