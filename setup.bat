@echo off
echo ===============================================================
echo   Fertigungsdaten Management System - Setup
echo ===============================================================
echo.

echo [1/5] Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js ist nicht installiert!
    echo Bitte Node.js von https://nodejs.org installieren
    pause
    exit /b 1
)

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Docker ist nicht installiert
    echo Docker wird fuer Container-Deployment benoetigt
)

echo [2/5] Setting up Backend...
cd backend
if not exist .env (
    copy .env.example .env
    echo .env Datei erstellt - Bitte anpassen!
)
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend Installation fehlgeschlagen
    pause
    exit /b 1
)
cd ..

echo [3/5] Setting up Frontend...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend Installation fehlgeschlagen
    pause
    exit /b 1
)
cd ..

echo [4/5] Initializing Git Repository...
if not exist .git (
    git init
    git add .
    git commit -m "Initial commit: Fertigungsdaten Management System"
    echo Git Repository initialisiert
) else (
    echo Git Repository existiert bereits
)

echo.
echo ===============================================================
echo   Setup abgeschlossen!
echo ===============================================================
echo.
echo Naechste Schritte:
echo.
echo 1. Datenbank starten (Docker):
echo    docker-compose up -d db
echo.
echo 2. Datenbank initialisieren:
echo    cd backend
echo    npm run init-db
echo.
echo 3. Backend starten:
echo    npm run dev
echo.
echo 4. Frontend starten (neues Terminal):
echo    cd frontend
echo    npm start
echo.
echo Projekt-Pfad: C:\Users\Master\mds
echo.
echo ===============================================================
pause
