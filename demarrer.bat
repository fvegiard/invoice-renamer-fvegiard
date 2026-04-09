@echo off
cd /d "%~dp0"
echo.
echo  DR Factures - Demarrage...
echo.

:: Kill any previous instance on port 3001
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start server in background
start "" /B node server.js

:: Wait for server to be ready
timeout /t 3 /nobreak >nul

:: Open browser
start "" http://localhost:3001

echo  Serveur demarre sur http://localhost:3001
echo  Fermer cette fenetre pour arreter le serveur.
echo.
