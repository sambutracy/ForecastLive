#!/usr/bin/env python3
"""
Quick test for F1 Live Data Service dependencies
"""

print("🏁 Testing F1 Live Data Service...")

try:
    import fastf1
    print("✅ Fast-F1: OK")
except Exception as e:
    print(f"❌ Fast-F1: {e}")

try:
    import flask
    print("✅ Flask: OK")
except Exception as e:
    print(f"❌ Flask: {e}")

try:
    import flask_cors
    print("✅ Flask-CORS: OK")
except Exception as e:
    print(f"❌ Flask-CORS: {e}")

try:
    import flask_socketio
    print("✅ Flask-SocketIO: OK")
except Exception as e:
    print(f"❌ Flask-SocketIO: {e}")

try:
    import pandas
    print("✅ Pandas: OK")
except Exception as e:
    print(f"❌ Pandas: {e}")

try:
    import requests
    print("✅ Requests: OK")
except Exception as e:
    print(f"❌ Requests: {e}")

print("\n🧪 Testing Fast-F1 functionality...")

try:
    # Test Fast-F1 basic functionality
    schedule = fastf1.get_event_schedule(2024)
    print(f"✅ Fast-F1 schedule: {len(schedule)} races found")
    
    # Test specific race data
    first_race = schedule.iloc[0]
    print(f"✅ First race: {first_race['EventName']} at {first_race['Location']}")
    
except Exception as e:
    print(f"❌ Fast-F1 functionality: {e}")

print("\n🚀 All tests complete!")
print("If all packages show OK, the F1 service should work.")
