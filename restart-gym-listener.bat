@echo off
title ALPHA ZONE GYM - Restart Biometric Listener
color 0E
echo Restarting Alpha Zone Biometric Listener...
call "%~dp0stop-gym-listener.bat"
timeout /t 2 >nul
call "%~dp0start-gym-listener.bat"
