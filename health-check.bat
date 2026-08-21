@echo off
title ALPHA ZONE GYM - Health Check Diagnostics
color 0B
cd /d "%~dp0device-service"

echo Running Alpha Zone System Diagnostics...
python health_check.py
echo.
pause
