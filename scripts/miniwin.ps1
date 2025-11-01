# File: miniwin.ps1
# Launch a minimal browser window for preview
# Usage: .\miniwin.ps1 -Url "https://example.com" -Width 420 -Height 260 -X 20 -Y 20

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Url,
  [int]$Width = 800,
  [int]$Height = 600,
  [int]$X = 300,
  [int]$Y = 200
)

# Resolve Edge path
$edgePaths = @(
  "$Env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$Env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ }

if (-not $edgePaths) {
  Write-Error "Microsoft Edge not found."
  exit 1
}

$edge = $edgePaths[0]

# --app opens a window without standard browser chrome (no tabs, minimal header)
# --window-size / --window-position control size and placement
# --no-first-run and --no-default-browser-check prevent extra windows
# --user-data-dir creates isolated session to prevent interference with main browser
$tempProfile = Join-Path $env:TEMP "EdgeMiniWindow_$([guid]::NewGuid().ToString('N').Substring(0,8))"

$args = @(
  "--app=$Url",
  "--window-size=$Width,$Height",
  "--window-position=$X,$Y",
  "--disable-features=HardwareMediaKeyHandling",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-popup-blocking",
  "--disable-session-crashed-bubble",
  "--user-data-dir=$tempProfile",
  "--window-name=GitImageTest Preview"
)

Start-Process -FilePath $edge -ArgumentList $args -WindowStyle Hidden | Out-Null
Write-Host "✅ Mini preview window launched at $Url" -ForegroundColor Green
Write-Host "   Size: ${Width}x${Height} at position ($X, $Y)" -ForegroundColor Gray

