#!/usr/bin/env pwsh
# Script to restart the backend server

Write-Host "🔄 Restarting Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Stop any running node server processes
Write-Host "1️⃣ Stopping existing Node.js server processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*server*" -or $_.Path -like "*node.exe*"
    }
    
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   ✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } else {
        Write-Host "   ℹ️ No running server processes found" -ForegroundColor Gray
    }
} catch {
    # Fallback: kill all node processes
    Write-Host "   ⚠️ Using fallback method..." -ForegroundColor Yellow
    taskkill /F /IM node.exe 2>$null
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "2️⃣ Starting backend server..." -ForegroundColor Yellow
Write-Host "   Running: npm run server" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Start the server
npm run server

