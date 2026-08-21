@echo off
title ALPHA ZONE GYM - Real-Time ESSL Biometric Listener
color 0A
cd /d "%~dp0device-service"

echo ==================================================
echo    ALPHA ZONE GYM BIOMETRIC LISTENER & OVERLAY
echo ==================================================
echo.
echo Starting ESSL Biometric Listener Engine...
echo Press Ctrl+C to stop the listener.
echo.

python device_service.py
pause
