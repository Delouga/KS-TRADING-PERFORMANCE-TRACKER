@echo off
title Creation du setup - KS TRADING PERFORMANCE TRACKER
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js n'est pas installe sur cet ordinateur.
  echo Telechargez la version LTS sur https://nodejs.org puis relancez ce fichier.
  start https://nodejs.org
  pause
  exit /b 1
)
echo.
echo === Etape 1/2 : installation des outils (internet requis, quelques minutes) ===
call npm install
if errorlevel 1 ( echo Echec de npm install & pause & exit /b 1 )
echo.
echo === Etape 2/2 : creation du setup .exe ===
call npm run dist
if errorlevel 1 ( echo Echec de la creation du setup & pause & exit /b 1 )
echo.
echo Termine ! Le setup se trouve dans le dossier "dist".
explorer dist
pause
