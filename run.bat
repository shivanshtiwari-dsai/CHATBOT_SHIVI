@echo off
title Shivi AI Chatbot
cd /d "%~dp0"
echo ======================================================
echo             SHIVI AI CHATBOT LAUNCHER
echo ======================================================
echo.
echo Checking port 5500 availability...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500 ^| findstr LISTENING 2^>nul') do (
    echo Freeing port 5500 from old instance (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Select backend engine:
echo   [1] Python FastAPI Backend (Flux AI, SSE Streaming, RAG)
echo   [2] Node.js Express Backend
echo.
echo Automatically starting Python engine in 3 seconds...
choice /c 12 /t 3 /d 1 /m "Enter choice (1 or 2):"

if errorlevel 2 goto NODE_ENGINE
goto PYTHON_ENGINE

:PYTHON_ENGINE
echo.
echo Starting Shivi AI Python Engine...
echo Opening http://localhost:5500 in default browser...
start http://localhost:5500
python python_server.py
goto FINISH

:NODE_ENGINE
echo.
echo Starting Shivi AI Node.js Engine...
echo Opening http://localhost:5500 in default browser...
start http://localhost:5500
node server.js
goto FINISH

:FINISH
pause
