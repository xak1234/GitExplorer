@echo off
REM Quick start script for Windows Command Prompt
REM Builds frontend and starts backend server

setlocal enabledelayedexpansion

echo.
echo 🚀 Building GitHub Commit Workspace Runner...
echo.

REM Build frontend
echo 📦 Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    exit /b 1
)

echo ✅ Frontend built successfully

REM Start server
echo.
echo 🎉 Starting server...
echo 📡 Server will be available at http://localhost:4000
echo.

call npm run server

endlocal
