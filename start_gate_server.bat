@echo off
title ALPHA ZONE GYM — EASYBIO LOCAL GATE CONTROL SERVER
color 0B
cd /d "%~dp0"

:: ── AUTOMATICALLY DISCOVER GYM PC LAN IPv4 ADDRESS ─────────────────────────
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "LAN_IP=%%a"
    goto :ip_found
)
:ip_found
set LAN_IP=%LAN_IP: =%
if "%LAN_IP%"=="" set LAN_IP=127.0.0.1

cls
echo ============================================================
echo    ALPHA ZONE GYM — EASYBIO LOCAL GATE CONTROL SERVER
echo ============================================================
echo.
echo  Status       : ONLINE
echo  Local Access : http://127.0.0.1:8000/gate-control
echo  Gym LAN URL  : http://%LAN_IP%:8000/gate-control
echo  EasyBio IP   : 192.168.18.11 (Port 4370)
echo  Server Port  : 8000
echo.
echo ============================================================
echo  Open http://%LAN_IP%:8000/gate-control on any phone/PC on Gym WiFi!
echo ============================================================
echo.

:: Set environment variables
set PORT=8000
set EASYBIO_DEVICE_IP=192.168.18.11
set EASYBIO_DEVICE_PORT=4370
set HOST=0.0.0.0

:: Start background Python ESSL Biometric Service if py/python available
where py >nul 2>&1
if %errorlevel%==0 (
    start /b "" py device-service\device_service.py > device-service\alpha_zone_gate_startup.log 2>&1
) else (
    start /b "" python device-service\device_service.py > device-service\alpha_zone_gate_startup.log 2>&1
)

:: Boot Express / Node API Server on 0.0.0.0:8000
if exist "backend\package.json" (
    cd backend
    npm run dev
) else (
    node server.js
)

pause
