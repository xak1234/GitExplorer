# Development Environment Launcher
# This script starts the development environment with split terminals

Write-Host "🚀 Starting Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Check for .env.local
if (-Not (Test-Path ".env.local")) {
    Write-Host "⚠️  Warning: .env.local not found!" -ForegroundColor Red
    Write-Host "   Creating from env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env.local"
        Write-Host "   ✓ Created .env.local - Please configure it with your API keys" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "📋 Starting servers in background..." -ForegroundColor Cyan
Write-Host ""

# Start backend server in new window
Write-Host "🔧 Backend Server: http://localhost:4000" -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run server" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend dev server in new window
Write-Host "🎨 Frontend Dev Server: http://localhost:5173" -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

# Wait a moment for frontend to start
Start-Sleep -Seconds 3

# Open preview.html in default browser
Write-Host "🎬 Opening Video Output..." -ForegroundColor Magenta
$previewPath = Join-Path $PSScriptRoot "preview.html"
Start-Process $previewPath

Write-Host ""
Write-Host "✅ Development environment started!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Quick Links:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "   Preview:  preview.html (standard, 36px header)" -ForegroundColor White
Write-Host "   Minimal:  preview-minimal.html (ultra-compact, 24px)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Check the separate terminal windows for logs"
Write-Host "   - The preview.html tab shows your running app"
Write-Host "   - Close terminal windows to stop servers"
Write-Host "   - Read DEVELOPMENT_SETUP.md for more info"
Write-Host ""

