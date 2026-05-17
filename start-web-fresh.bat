@echo off
setlocal
cd /d "%~dp0"
echo Starting Melisa Terminal App web preview on http://localhost:8002/
echo If an old Expo window is already running, close it with Ctrl+C before starting this one.
npm run web:fresh
