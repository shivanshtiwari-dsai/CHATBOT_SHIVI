@echo off
title Shivi AI - Node.js Express Engine
cd /d "%~dp0"
echo ======================================================
echo          Starting Shivi AI (Node.js Engine)
echo ======================================================
echo.
echo Opening Shivi AI in your default web browser...
start http://localhost:5500
echo.
echo Server running at: http://localhost:5500
echo Press Ctrl+C in this window to stop the server anytime.
echo.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
node server.js
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js backend server encountered an issue.
    pause
)
