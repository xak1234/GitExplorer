# Production startup script for Windows PowerShell
# This script builds both frontend and backend, then starts the server

Write-Host "🚀 Building GitHub Commit Workspace Runner..." -ForegroundColor Cyan

# Build frontend with Vite
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
}

# The backend is written in TypeScript and will be run directly with tsx
Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Start the server (backend will serve the frontend)
Write-Host "🎉 Starting server..." -ForegroundColor Cyan
Write-Host "📡 Server will be available at http://localhost:4000" -ForegroundColor Green

npm run server
