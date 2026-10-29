@echo off
title UPI Spending Analyser
echo ===================================================
echo Starting UPI Spending Analyser...
echo ===================================================

cd /d "%~dp0"

if not exist ".venv\Scripts\streamlit.exe" (
    echo Error: Virtual environment not found.
    echo Please make sure the setup completed properly.
    pause
    exit /b 1
)

echo Launching Streamlit dashboard in your browser...
".venv\Scripts\streamlit.exe" run app.py

pause

