@echo off
cd /d "C:\Users\defaultuser\Desktop\alpha gym zone\device-service"
:: Start python script in the background
start /b "" python alpha_zone_device_service.py > alpha_zone_device_service_startup.log 2>&1
