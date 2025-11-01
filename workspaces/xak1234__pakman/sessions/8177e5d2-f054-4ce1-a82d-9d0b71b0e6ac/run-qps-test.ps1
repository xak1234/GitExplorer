# Local QPS Testing Script for PAKmaster Multiplayer Performance
# Run this script to perform automated QPS profiling

Write-Host "📊 PAKmaster Multiplayer QPS Testing" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if running in correct directory
if (-not (Test-Path "index.html")) {
    Write-Host "❌ Error: Please run this script from the pakman8 project directory" -ForegroundColor Red
    Write-Host "   Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "   Expected files: index.html, firebase-qps-profiler.js" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found project files" -ForegroundColor Green

# Start a simple HTTP server for testing
Write-Host "🌐 Starting local HTTP server..." -ForegroundColor Yellow

# Try to find and use Python HTTP server
$pythonServer = $null
try {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonServer = Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "8080" -PassThru -WindowStyle Hidden
        Write-Host "✅ Python HTTP server started on http://localhost:8080" -ForegroundColor Green
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonServer = Start-Process -FilePath "python3" -ArgumentList "-m", "http.server", "8080" -PassThru -WindowStyle Hidden
        Write-Host "✅ Python3 HTTP server started on http://localhost:8080" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Python not found, trying Node.js..." -ForegroundColor Yellow
}

# Try Node.js http-server if Python failed
$nodeServer = $null
if (-not $pythonServer) {
    try {
        # Install http-server globally if not present
        $httpServerInstalled = npm list -g http-server 2>$null
        if (-not $httpServerInstalled) {
            Write-Host "📦 Installing http-server globally..." -ForegroundColor Yellow
            npm install -g http-server
        }
        
        $nodeServer = Start-Process -FilePath "npx" -ArgumentList "http-server", ".", "-p", "8080", "-c-1" -PassThru -WindowStyle Hidden
        Write-Host "✅ Node.js HTTP server started on http://localhost:8080" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not start HTTP server. Please install Python or Node.js" -ForegroundColor Red
        exit 1
    }
}

# Wait for server to start
Start-Sleep -Seconds 2

# Open multiple browser tabs for testing
Write-Host "🌐 Opening browser tabs for multiplayer testing..." -ForegroundColor Yellow

$urls = @(
    "http://localhost:8080",
    "http://localhost:8080",
    "http://localhost:8080",
    "http://localhost:8080"
)

foreach ($url in $urls) {
    Start-Process $url
    Start-Sleep -Seconds 1
}

Write-Host "✅ Opened 4 browser tabs" -ForegroundColor Green

Write-Host ""
Write-Host "🧪 TESTING INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "1. In the FIRST browser tab:" -ForegroundColor White
Write-Host "   • Click 'Host Multiplayer'" -ForegroundColor Yellow
Write-Host "   • Select a level and start the game" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. In the OTHER browser tabs:" -ForegroundColor White
Write-Host "   • Click 'Join Multiplayer Games'" -ForegroundColor Yellow
Write-Host "   • Join the hosted game" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Once all players have joined:" -ForegroundColor White
Write-Host "   • Press F12 in ANY tab to open Developer Console" -ForegroundColor Yellow
Write-Host "   • Type: startQPSTest()" -ForegroundColor Green
Write-Host "   • Press Enter to start the automated test" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. The test will run for 3 minutes total:" -ForegroundColor White
Write-Host "   • 1 minute baseline (no optimizations)" -ForegroundColor Red
Write-Host "   • 1 minute with Firebase optimizer" -ForegroundColor Yellow  
Write-Host "   • 1 minute with all optimizations" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ IMPORTANT: Keep playing actively during ALL test phases!" -ForegroundColor Red
Write-Host "   • Move players around continuously" -ForegroundColor White
Write-Host "   • Collect pellets and power-ups" -ForegroundColor White
Write-Host "   • Keep at least 2 players active" -ForegroundColor White

Write-Host ""
Write-Host "📊 MONITORING:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "• Console will show real-time QPS statistics every 5 seconds" -ForegroundColor White
Write-Host "• Use getQPSReport() in console for current stats" -ForegroundColor Yellow
Write-Host "• Use exportQPSData() to save detailed performance data" -ForegroundColor Yellow
Write-Host "• Results will be automatically exported after test completes" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 MANUAL TESTING COMMANDS:" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "getQPSReport()     - Show current performance stats" -ForegroundColor Yellow
Write-Host "exportQPSData()    - Export detailed performance data" -ForegroundColor Yellow
Write-Host "resetQPS()         - Reset performance counters" -ForegroundColor Yellow
Write-Host "startQPSTest()     - Start automated comparison test" -ForegroundColor Green

Write-Host ""
Write-Host "Press any key to stop the HTTP server and exit..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup: Stop HTTP server
if ($pythonServer) {
    Write-Host "🛑 Stopping Python HTTP server..." -ForegroundColor Yellow
    Stop-Process -Id $pythonServer.Id -Force
} elseif ($nodeServer) {
    Write-Host "🛑 Stopping Node.js HTTP server..." -ForegroundColor Yellow
    Stop-Process -Id $nodeServer.Id -Force
}

Write-Host "✅ Testing session ended. Check downloaded files for results!" -ForegroundColor Green