@echo off
setlocal enabledelayedexpansion
title Claude Code Remote

echo ========================================
echo   Claude Code Remote - Starting...
echo ========================================
echo.

echo [1/2] Starting server on port 3001...
start "Claude-Server" cmd /k "cd /d C:\Users\19915\claude-remote && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting ngrok tunnel...
start "Claude-Ngrok" cmd /k "D:\ngrok\ngrok.exe http 3001 --region ap --basic-auth user:Lhy@123456"

echo.
echo ========================================
echo   Both services started.
echo   Check the ngrok window for the URL.
echo ========================================
echo.
pause
