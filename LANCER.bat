@echo off
title Test - Forex Pro Trader Tracker
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Telechargez-le sur https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules ( call npm install )
call npm start
