@echo off
title ALPHA ZONE GYM - Stop Biometric Listener
color 0C
echo Stopping Alpha Zone Biometric Listener Service...
taskkill /F /FI "WINDOWTITLE eq ALPHA ZONE GYM - Real-Time ESSL Biometric Listener*" /T >nul 2>&1
wmic process where "commandline like '%%device_service.py%%'" call terminate >nul 2>&1
echo Listener service stopped successfully.
timeout /t 3 >nul
