@echo off
title Hotel Narvada Suite App

echo Starting Hotel Narvada Suite App...

:: =====================================
:: Set Fixed IP Address (Static)
:: =====================================
echo Setting fixed IP address...

netsh interface ip set address name="Ethernet" static 192.168.1.65 255.255.255.0 192.168.1.254
netsh interface ip set dns name="Ethernet" static 8.8.8.8
netsh interface ip add dns name="Ethernet" 1.1.1.1 index=2

timeout /t 2 /nobreak > nul

:: =====================================
:: Auto-update IP address in config files
:: =====================================
echo Updating IP configuration...
node update-ip.js

:: =====================================
:: Start Backend
:: =====================================
echo Starting Backend...
cd backend
start cmd /k "npm install && npm run dev"

:: Go back to root
cd ..

:: =====================================
:: Start Frontend
:: =====================================
echo Starting Frontend...
cd frontend
start cmd /k "npm install && npm run dev -- --host"

:: Wait a few seconds for frontend to boot
timeout /t 6 /nobreak > nul

:: =====================================
:: Open App in Chrome
:: =====================================
echo Opening app in browser...
start chrome http://192.168.101.3:5173/

echo App is starting in separate windows...
pause