@echo off
cd /d "%~dp0"
:: Start python script in the background
start /b "" python device_service.py > alpha_zone_device_service_startup.log 2>&1
