@echo off
title Launch Shivi AI
cd /d "%~dp0"

:: 1. Check if server is already active on port 5500
netstat -ano | findstr :5500 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Shivi AI Server is already running.
    echo Opening http://localhost:5500 ...
    start http://localhost:5500
    exit /b 0
)

:: 2. Launch backend server minimized if not already active
echo Starting Shivi AI Backend Server...
where node >nul 2>&1
if %errorlevel% equ 0 (
    start "Shivi AI Server" /min cmd /c "node server.js"
) else (
    start "Shivi AI Server" /min cmd /c "python python_server.py"
)

:: 3. Wait briefly for server startup and open in browser
ping 127.0.0.1 -n 3 >nul
echo Opening Shivi AI in your default web browser...
start http://localhost:5500
exit /b 0
