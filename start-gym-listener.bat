@echo off
title ALPHA ZONE GYM - Real-Time ESSL Biometric Listener
color 0A
cd /d "%~dp0"

echo ==================================================
echo    ALPHA ZONE GYM BIOMETRIC LISTENER AND OVERLAY
echo ==================================================
echo.
echo Starting ESSL Biometric Listener Engine...
echo Press Ctrl+C to stop the listener.
echo.

where py >nul 2>&1
if %errorlevel%==0 (
    py device-service\device_service.py
) else (
    python device-service\device_service.py
)
pause
