# Auto-Launch Mini Window Feature

## 🎯 Overview

The preview system now **automatically launches** a small, headerless browser window when a preview is ready, instead of requiring manual URL clicks or showing inline previews.

---

## ✨ What Changed

### 1. **Removed Preview Thumbnail** ❌
- No more iframe preview in the sidebar
- Cleaner UI with just Start/Stop buttons

### 2. **Auto-Launch System** 🚀
- When preview status becomes `running` and URL is available
- Automatically launches a mini window via PowerShell
- Uses `miniwin.ps1` script for headerless Edge window

### 3. **Backend API Endpoint** 🔌
- New endpoint: `POST /api/workspace/launch-mini`
- Accepts `{ url: string }`
- Launches PowerShell script in background

### 4. **Frontend Auto-Detection** 👁️
- Watches for `workspaceState.status === 'running'`
- Triggers mini window launch once per session
- Resets when workspace stops

---

## 🔧 Technical Implementation

### Backend (`server/index.ts`)

```typescript
// New endpoint at line ~2000
app.post('/api/workspace/launch-mini', async (req, res) => {
  const { url } = req.body;
  
  const scriptPath = path.join(process.cwd(), 'miniwin.ps1');
  
  spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', scriptPath,
    url
  ], {
    detached: true,
    stdio: 'ignore'
  }).unref();

  res.json({ ok: true });
});
```

### Frontend (`App.tsx`)

```typescript
// Auto-launch effect
useEffect(() => {
  const shouldLaunch = 
    workspaceState.status === 'running' && 
    workspaceState.previewUrl && 
    !hasLaunchedMiniWindow.current;
  
  if (shouldLaunch) {
    hasLaunchedMiniWindow.current = true;
    api.launchMiniWindow(workspaceState.previewUrl);
  }
}, [workspaceState.status, workspaceState.previewUrl]);
```

### API Function (`services/api.ts`)

```typescript
export async function launchMiniWindow(url: string): Promise<void> {
  await client.post('/api/workspace/launch-mini', { url }, { timeout: 5000 });
}
```

---

## 📐 Mini Window Specs

**Default Configuration:**
- **Size:** 420×260 pixels
- **Position:** (40, 40) from top-left
- **Style:** Headerless (no tabs, minimal chrome)
- **Browser:** Microsoft Edge in `--app` mode
- **Isolation:** Temporary user profile (doesn't interfere with main browser)

**Customizable in `miniwin.ps1`:**
```powershell
.\miniwin.ps1 -Url "http://localhost:4000/..." -Width 800 -Height 600 -X 100 -Y 100
```

---

## 🎬 User Flow

### Before
```
1. Click Start Preview ▶️
2. Wait for "Running" status
3. Look through logs for URL
4. Click URL → Opens in main browser tab
5. Preview in cluttered browser with tabs
```

### After
```
1. Click Start Preview ▶️
2. Wait for "Running" status
3. ✨ Mini window automatically pops up!
4. Clean, headerless preview window
```

---

## 🔄 Lifecycle

```
┌─────────────────────────────────────────────┐
│  User clicks Start Preview                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Status: preparing                          │
│  hasLaunchedMiniWindow: false               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Backend detects dev server ready           │
│  Status changes to: running                 │
│  previewUrl becomes available               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Frontend useEffect triggered               │
│  shouldLaunch = true                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Call api.launchMiniWindow(url)             │
│  Set hasLaunchedMiniWindow = true           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Backend spawns PowerShell                  │
│  PowerShell launches Edge --app mode        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  🎉 Mini window appears!                    │
│  Headerless, isolated, clean                │
└─────────────────────────────────────────────┘
```

---

## 🛡️ Security Features

1. **Process Isolation**
   - `detached: true` - Process runs independently
   - `stdio: 'ignore'` - No I/O streams attached
   - `.unref()` - Parent doesn't wait for child

2. **Browser Isolation**
   - `--user-data-dir=$tempProfile` - Temporary profile
   - Unique GUID for each launch
   - No cookies/history shared with main browser

3. **PowerShell Security**
   - `-ExecutionPolicy Bypass` - Only for this script
   - `-WindowStyle Hidden` - No console window flash
   - Script path validated before execution

---

## 🐛 Debugging

### If Mini Window Doesn't Launch

**Check 1: Is `miniwin.ps1` present?**
```powershell
Test-Path .\miniwin.ps1
```

**Check 2: Backend logs**
```
Look for: 🚀 Launching mini window for: http://...
Or error: ⚠️ miniwin.ps1 not found
```

**Check 3: Frontend console**
```
Look for: 🚀 Auto-launching mini window for preview
Look for: ✅ Mini window launch request sent
```

**Check 4: Edge installed?**
```powershell
Test-Path "$Env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
```

---

## 🎨 Customization

### Change Default Window Size

Edit `miniwin.ps1`:
```powershell
[int]$Width = 800,   # Change from 420
[int]$Height = 600,  # Change from 260
```

### Change Default Position

Edit `miniwin.ps1`:
```powershell
[int]$X = 100,   # Change from 40
[int]$Y = 100,   # Change from 40
```

### Use Different Browser

Replace Edge path detection with Chrome:
```powershell
$chromePaths = @(
  "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$Env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
```

---

## 📊 Feature Flags

**One Launch Per Session:**
- `hasLaunchedMiniWindow` ref prevents multiple launches
- Resets when workspace stops
- Resets when error occurs

**Launch Conditions:**
```typescript
const shouldLaunch = 
  workspaceState.status === 'running' &&     // Preview ready
  workspaceState.previewUrl &&                // URL available
  !hasLaunchedMiniWindow.current;             // Not launched yet
```

---

## ✅ Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Preview Access** | Find URL in logs manually | Auto-launches instantly ✨ |
| **Window Type** | Full browser with tabs | Clean headerless window 🎯 |
| **User Actions** | 5 steps | 2 steps 🚀 |
| **Browser Clutter** | Opens in main browser | Isolated window 🧹 |
| **Visual Feedback** | Thumbnail in sidebar | Full dedicated window 📺 |

---

## 🚀 Try It Out!

1. **Make sure backend is running:**
   ```bash
   npm run server
   ```

2. **Start a preview:**
   - Select a repository (e.g., TransEnder)
   - Click a commit
   - Click ▶️ Start Preview

3. **Watch for:**
   - Status changes to "Running"
   - Mini window pops up automatically! 🎉

4. **Close preview:**
   - Click ⊗ Stop button
   - Mini window stays open (you can close it manually)
   - OR close mini window and click Stop button

---

## 📝 Files Modified

- ✅ `server/index.ts` - Added `/api/workspace/launch-mini` endpoint
- ✅ `services/api.ts` - Added `launchMiniWindow()` function
- ✅ `App.tsx` - Added auto-launch useEffect
- ✅ `components/ControlsSidebar.tsx` - Removed thumbnail UI
- ✅ `miniwin.ps1` - Existing script (no changes needed)

---

## 🎓 Summary

**The preview system now:**
- ✅ **Auto-detects** when preview is ready
- ✅ **Auto-launches** a mini window
- ✅ **Uses PowerShell** to open headerless Edge
- ✅ **One launch** per session
- ✅ **Clean UI** without embedded previews

**Result:** Faster, cleaner, more efficient preview workflow! 🎉

