# Mini Preview Window Guide

## Overview
Launch a compact, frameless preview window using Microsoft Edge's `--app` mode for a distraction-free preview experience.

## Features
- **Frameless Design** - No browser tabs, address bar, or bookmarks
- **Custom Sizing** - Set exact width and height
- **Custom Positioning** - Place window anywhere on screen
- **Minimal Chrome** - Only essential window controls
- **Perfect for Side-by-Side** - Code + preview workflow

## Usage

### Method 1: Direct Script
```powershell
# Basic usage (default 420x260)
.\miniwin.ps1 -Url "http://localhost:4000/preview/SESSION_ID/"

# Custom size and position
.\miniwin.ps1 -Url "http://localhost:4000/preview/SESSION_ID/" `
  -Width 600 -Height 900 -X 50 -Y 50

# Tall window for mobile preview
.\miniwin.ps1 -Url "http://localhost:4000/preview/SESSION_ID/" `
  -Width 375 -Height 812 -X 20 -Y 20

# Tablet size
.\miniwin.ps1 -Url "http://localhost:4000/preview/SESSION_ID/" `
  -Width 768 -Height 1024 -X 100 -Y 50
```

### Method 2: Simplified Launcher
```powershell
# Use default settings (480x720)
.\launch-mini-preview.ps1 -PreviewUrl "http://localhost:4000/preview/SESSION_ID/"

# Custom configuration
.\launch-mini-preview.ps1 `
  -PreviewUrl "http://localhost:4000/preview/SESSION_ID/" `
  -Width 600 -Height 900 -X 50 -Y 50
```

## Common Configurations

### Mobile Devices

**iPhone 14 Pro**
```powershell
.\miniwin.ps1 -Url $url -Width 393 -Height 852 -X 20 -Y 20
```

**Samsung Galaxy S21**
```powershell
.\miniwin.ps1 -Url $url -Width 360 -Height 800 -X 20 -Y 20
```

**iPhone SE**
```powershell
.\miniwin.ps1 -Url $url -Width 375 -Height 667 -X 20 -Y 20
```

### Tablets

**iPad Air**
```powershell
.\miniwin.ps1 -Url $url -Width 820 -Height 1180 -X 50 -Y 50
```

**iPad Mini**
```powershell
.\miniwin.ps1 -Url $url -Width 744 -Height 1133 -X 50 -Y 50
```

### Desktop Breakpoints

**Laptop (1366x768)**
```powershell
.\miniwin.ps1 -Url $url -Width 1280 -Height 720 -X 40 -Y 40
```

**Desktop Small (1920x1080)**
```powershell
.\miniwin.ps1 -Url $url -Width 1600 -Height 900 -X 160 -Y 90
```

### Game Window (for Lifty)
```powershell
# Perfect square for pixel-art games
.\miniwin.ps1 -Url $url -Width 800 -Height 600 -X 20 -Y 20
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `Url` | string | (required) | Full URL to preview |
| `Width` | int | 420 | Window width in pixels |
| `Height` | int | 260 | Window height in pixels |
| `X` | int | 40 | Horizontal position from left |
| `Y` | int | 40 | Vertical position from top |

## Integration with Workspace Runner

### Quick Launch Workflow

1. **Start Preview** in the main app
2. **Copy Session URL** from the preview panel
3. **Run PowerShell script:**
   ```powershell
   $sessionUrl = "http://localhost:4000/preview/YOUR_SESSION_ID/"
   .\miniwin.ps1 -Url $sessionUrl -Width 600 -Height 900
   ```

### Automated Launch (Future Enhancement)

A "🪟 Mini Window" button could be added to the UI that:
1. Detects the current preview URL
2. Executes the PowerShell script automatically
3. Opens the mini window with preset dimensions

## Browser Requirements

- **Microsoft Edge** (required)
  - Path: `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
  - Or: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- **Alternative**: Could be adapted for Chrome with similar flags

## Advantages Over Standard Browser

| Feature | Standard Browser | Mini Window |
|---------|-----------------|-------------|
| **Screen Space** | Large chrome, tabs | Minimal chrome |
| **Distraction** | Other tabs visible | Focused view |
| **Positioning** | Manual resize | Precise placement |
| **Workflow** | Switch between tabs | Side-by-side view |
| **Responsive Testing** | DevTools required | Native sizing |

## Tips & Tricks

### 1. Multi-Monitor Setup
```powershell
# Place on second monitor (1920px + offset)
.\miniwin.ps1 -Url $url -Width 800 -Height 600 -X 1940 -Y 100
```

### 2. Corner Positioning
```powershell
# Top-right corner
.\miniwin.ps1 -Url $url -Width 400 -Height 600 -X 1500 -Y 20

# Bottom-right corner  
.\miniwin.ps1 -Url $url -Width 400 -Height 600 -X 1500 -Y 400
```

### 3. Responsive Design Testing
Launch multiple windows at different breakpoints:
```powershell
# Mobile
.\miniwin.ps1 -Url $url -Width 375 -Height 667 -X 20 -Y 20

# Tablet
.\miniwin.ps1 -Url $url -Width 768 -Height 1024 -X 420 -Y 20

# Desktop
.\miniwin.ps1 -Url $url -Width 1280 -Height 720 -X 1220 -Y 20
```

### 4. Save as PowerShell Alias
Add to your PowerShell profile:
```powershell
# In ~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1
function Open-MiniPreview {
    param([string]$Url, [int]$Width=600, [int]$Height=900)
    & "D:\git\GitImageTest\miniwin.ps1" -Url $Url -Width $Width -Height $Height
}
```

Then use:
```powershell
Open-MiniPreview "http://localhost:4000/preview/abc123/"
```

## Limitations

1. **Not Truly Frameless** - Edge's `--app` mode still shows minimal window chrome
2. **Windows Only** - PowerShell script designed for Windows
3. **Edge Required** - Must have Microsoft Edge installed
4. **Manual Launch** - Currently requires manual script execution

## Future Enhancements

### Planned Features
- [ ] Add "Mini Window" button in UI
- [ ] Auto-detect preview URL
- [ ] Save preferred window size/position
- [ ] Support Chrome as alternative
- [ ] Cross-platform support (macOS, Linux)
- [ ] Multiple preset configurations
- [ ] Window management (close all, reposition)

### Potential Electron Integration
For truly frameless windows, consider:
- Electron BrowserWindow with `frame: false`
- Custom title bar
- Drag-to-move functionality
- Always-on-top option
- Transparency effects

---

## Quick Reference

**Default Window:**
```powershell
.\miniwin.ps1 -Url "YOUR_URL"
```

**Mobile Preview:**
```powershell
.\miniwin.ps1 -Url "YOUR_URL" -Width 375 -Height 812
```

**Side-by-Side:**
```powershell
.\miniwin.ps1 -Url "YOUR_URL" -Width 800 -Height 900 -X 1100 -Y 100
```

**Game Window:**
```powershell
.\miniwin.ps1 -Url "YOUR_URL" -Width 800 -Height 600 -X 20 -Y 20
```

---

**Perfect for coding while previewing! 🎯**

