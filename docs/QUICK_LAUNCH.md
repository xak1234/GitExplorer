# 🚀 Quick Launch Guide

## Fastest Way to Start

### Windows PowerShell (Recommended)
```powershell
.\start-dev.ps1
```

### Windows Command Prompt
```cmd
start-dev.cmd
```

### Manual (All Platforms)
```bash
npm run dev:full
```

---

## What Gets Launched

When you run the startup script, three things happen:

### 1. **Backend Server Terminal** 
   - Port: 4000
   - Shows: GitHub API calls, git operations, session management
   - Keep this running to handle backend requests

### 2. **Frontend Dev Server Terminal**
   - Port: 5173  
   - Shows: Vite HMR, React component updates, build warnings
   - Auto-reloads when you save files

### 3. **Video Output Tab** 
   - **preview.html** - Compact controls (36px header, collapsible to 28px)
   - **preview-minimal.html** - Ultra-minimal (24px header, can hide completely)
   - Shows: Your running application in an iframe
   - Auto-detects when servers are ready
   - Has controls for reload, browser launch, and DevTools

---

## VS Code Integration

### Using Command Palette (Ctrl+Shift+P / Cmd+Shift+P)

1. **Type**: `Tasks: Run Task`
2. **Select**: `Start Full Development Environment`
3. **Wait**: Terminals will open automatically
4. **Open**: `preview.html` in the editor or Simple Browser

### Using Keyboard Shortcuts

| Action | Shortcut (Win/Linux) | Shortcut (Mac) |
|--------|---------------------|----------------|
| Run Task | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Toggle Terminal | `` Ctrl+` `` | `` Cmd+` `` |
| Split Terminal | `Ctrl+Shift+5` | `Cmd+Shift+5` |

---

## Recommended Panel Layout

```
┌──────────────────────────────┬──────────────────────────────┐
│                              │                              │
│   Your Code                  │   preview.html               │
│   (app.tsx, components,      │   (Video Output - Live App)  │
│    server files, etc.)       │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
┌──────────────────────────────┬──────────────────────────────┐
│  Terminal 1: Backend Server  │  Terminal 2: Frontend Server │
│  npm run server              │  npm run dev                 │
│  Port 4000                   │  Port 5173                   │
└──────────────────────────────┴──────────────────────────────┘
```

### To Set Up This Layout:

1. **Open your code file** (e.g., `App.tsx`)
2. **Split editor right**: `Ctrl+\` (Windows) or `Cmd+\` (Mac)
3. **Open preview.html** in the right pane
4. **Toggle terminal**: `` Ctrl+` `` or `` Cmd+` ``
5. **Split terminal**: `Ctrl+Shift+5` or `Cmd+Shift+5`
6. **Run tasks** in each terminal OR use `Start Full Development Environment` task

---

## What You Should See

### ✅ Backend Server Terminal
```
🚀 Starting GitHub Commit Workspace Runner...
🔍 Validating GitHub token and permissions...
✅ GitHub token valid for user: your-username
✅ Token has "repo" scope - private repositories accessible
📁 Workspace directory: D:\git\GitImageTest\workspaces
🎉 Server ready!
📡 Server listening on: http://localhost:4000
```

### ✅ Frontend Dev Server Terminal
```
VITE v6.2.0  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### ✅ Video Output (preview.html or preview-minimal.html)
```
🎬 Video Output  [↻] [🌐] [🔧] [⇕]  Status: ✓
[Your running application fills the space below]
```

**Compact controls (36px)** - Click [⇕] to minimize to 28px
**Minimal version** - Use `preview-minimal.html` for 24px header (double-click to hide)

---

## Troubleshooting Quick Fixes

### "Port already in use"
```powershell
# Kill processes on port 4000 and 5173
netstat -ano | findstr :4000
taskkill /PID <PID> /F

netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### "Server not responding" in preview.html
1. Check both terminal windows for errors
2. Try accessing http://localhost:5173 directly
3. Click "Retry" in the preview interface
4. Check `.env.local` is configured

### "Cannot find module"
```bash
npm install
```

### Preview shows blank page
1. Check browser console (F12) for errors
2. Verify Vite server is running (check terminal)
3. Try refreshing with Ctrl+Shift+R (hard refresh)

---

## Daily Workflow

1. **Start**: Run `.\start-dev.ps1` once per session
2. **Code**: Edit files in VS Code - auto-reloads happen
3. **Preview**: Watch changes live in preview.html
4. **Test**: Use the main app at http://localhost:5173
5. **Debug**: Check terminal logs or use VS Code debugger
6. **Stop**: Close the terminal windows when done

---

## Advanced: VS Code Simple Browser

For an even more integrated experience:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type: `Simple Browser: Show`
3. Enter URL: `http://localhost:5173`

Now your app runs inside VS Code!

---

## Next Steps

- Read **DEVELOPMENT_SETUP.md** for detailed configuration
- Check **README.md** for project overview
- Review **.env.local** for environment variables
- See **QUICK_START.md** for first-time setup

---

## Need Help?

- **Terminal shows errors**: Check the specific error message and logs
- **App won't load**: Ensure both servers are running (check terminals)
- **Preview.html blank**: Right-click → Inspect → Check console
- **General issues**: See DEVELOPMENT_SETUP.md troubleshooting section

