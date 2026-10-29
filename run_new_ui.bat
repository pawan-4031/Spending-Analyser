@echo off
title UPI Spending Analyser - Modern UI
echo ===================================================
echo  UPI Spending Analyser  (New UI)
echo ===================================================
echo.

echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
start "API Backend" cmd /k "cd /d ""%~dp0"" & .venv\Scripts\python.exe server.py"

echo Waiting for backend to initialise...
timeout /t 3 /nobreak >nul

echo [2/2] Starting React dev server on http://localhost:5173 ...
start "React Frontend" cmd /k "cd /d ""%~dp0frontend"" & npm run dev -- --open"

echo.
echo ===================================================
echo  Backend : http://localhost:8000
echo  Frontend: http://localhost:5173
echo ===================================================
echo.
echo Both windows have opened. Close them to stop the servers.
pause
