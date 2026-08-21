@echo off
title ALPHA ZONE GYM - Health Check Diagnostics
color 0B
cd /d "%~dp0"

echo Running Alpha Zone System Diagnostics...
where py >nul 2>&1
if %errorlevel%==0 (
    py device-service\health_check.py
) else (
    python device-service\health_check.py
)
echo.
pause
