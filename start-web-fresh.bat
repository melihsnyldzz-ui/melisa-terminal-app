@echo off
setlocal
cd /d "%~dp0"
echo Starting Melisa Terminal App web preview on http://localhost:8002/
npm run web:fresh
