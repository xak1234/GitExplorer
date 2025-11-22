# Clean Old Workspace Sessions
# This script removes old workspace session directories to free up disk space

param(
    [int]$DaysOld = 7,
    [switch]$DryRun = $false
)

$WorkspaceRoot = Join-Path $PSScriptRoot "..\workspaces"
$CutoffDate = (Get-Date).AddDays(-$DaysOld)

Write-Host "🧹 Cleaning workspace sessions older than $DaysOld days..." -ForegroundColor Cyan
Write-Host "   Cutoff date: $($CutoffDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray

if (-not (Test-Path $WorkspaceRoot)) {
    Write-Host "✅ No workspaces directory found - nothing to clean" -ForegroundColor Green
    exit 0
}

$sessionDirs = Get-ChildItem -Path $WorkspaceRoot -Directory | 
    Get-ChildItem -Directory -Filter "sessions" -ErrorAction SilentlyContinue |
    Get-ChildItem -Directory -ErrorAction SilentlyContinue

$totalSize = 0
$totalCount = 0
$cleanedSize = 0
$cleanedCount = 0

foreach ($sessionDir in $sessionDirs) {
    $totalCount++
    $size = (Get-ChildItem -Path $sessionDir.FullName -Recurse -File -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum
    $totalSize += $size
    
    if ($sessionDir.LastWriteTime -lt $CutoffDate) {
        $sizeMB = [math]::Round($size / 1MB, 2)
        
        if ($DryRun) {
            Write-Host "   [DRY RUN] Would remove: $($sessionDir.Name) ($sizeMB MB, last modified: $($sessionDir.LastWriteTime.ToString('yyyy-MM-dd')))" -ForegroundColor Yellow
        } else {
            Write-Host "   🗑️  Removing: $($sessionDir.Name) ($sizeMB MB, last modified: $($sessionDir.LastWriteTime.ToString('yyyy-MM-dd')))" -ForegroundColor Red
            try {
                Remove-Item -Path $sessionDir.FullName -Recurse -Force -ErrorAction Stop
                $cleanedSize += $size
                $cleanedCount++
            } catch {
                Write-Host "   ❌ Failed to remove $($sessionDir.Name): $_" -ForegroundColor Red
            }
        }
    }
}

$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
$cleanedSizeMB = [math]::Round($cleanedSize / 1MB, 2)

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Total sessions: $totalCount ($totalSizeMB MB)" -ForegroundColor Gray
Write-Host "   Cleaned: $cleanedCount sessions ($cleanedSizeMB MB)" -ForegroundColor Green
Write-Host "   Remaining: $($totalCount - $cleanedCount) sessions ($([math]::Round(($totalSize - $cleanedSize) / 1MB, 2)) MB)" -ForegroundColor Gray

if ($DryRun -and $cleanedCount -gt 0) {
    Write-Host ""
    Write-Host "💡 Run without -DryRun to actually remove these sessions" -ForegroundColor Yellow
}

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
