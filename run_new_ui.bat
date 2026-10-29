@echo off
title UPI Spending Analyser - Modern UI
echo ===================================================
echo  UPI Spending Analyser  (New UI)
echo ===================================================
echo.
echo Starting FastAPI backend...
start "API Backend" cmd /k "cd /d "%~dp0" && .venv\Scripts\python.exe server.py"

timeout /t 2 /nobreak >nul

echo Starting React frontend dev server...
start "React Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --open"

echo.
echo ===================================================
echo  Backend API: http://localhost:8000
echo  Frontend UI: http://localhost:5173
echo ===================================================
echo.
echo Both servers are running. Close the two terminal windows to stop.
pause
