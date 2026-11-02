@echo off
title ALPHA ZONE GYM - Stop Biometric Listener
color 0C
cd /d "%~dp0"

echo Stopping Alpha Zone Biometric Listener Service...
taskkill /F /FI "WINDOWTITLE eq ALPHA ZONE GYM - Real-Time ESSL Biometric Listener*" /T >nul 2>&1
:: wmic is removed on current Windows 11, so stop any python/py running
:: device_service.py (including background ones started by start_gate_server.bat).
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'python.exe','pythonw.exe','py.exe' -and $_.CommandLine -like '*device_service.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo Listener service stopped successfully.
timeout /t 3 >nul
