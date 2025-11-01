# Simplified launcher for mini preview window
# Automatically uses the correct preview URL from the running workspace

param(
  [string]$PreviewUrl = "http://localhost:4000/preview",
  [int]$Width = 480,
  [int]$Height = 720,
  [int]$X = 20,
  [int]$Y = 20
)

Write-Host "🚀 Launching mini preview window..." -ForegroundColor Cyan
Write-Host "   URL: $PreviewUrl" -ForegroundColor Gray
Write-Host "   Size: ${Width}x${Height}" -ForegroundColor Gray
Write-Host "   Position: ($X, $Y)" -ForegroundColor Gray
Write-Host ""

# Call the main miniwin script
& "$PSScriptRoot\miniwin.ps1" -Url $PreviewUrl -Width $Width -Height $Height -X $X -Y $Y

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Mini window opened successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to open mini window" -ForegroundColor Red
}

