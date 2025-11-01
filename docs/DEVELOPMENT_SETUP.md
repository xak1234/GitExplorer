# Development Environment Setup

This document explains how to use the multi-panel development environment for this project.

## Overview

The development environment consists of:
1. **Terminal Panel** - For running commands and viewing logs
2. **Preview Panel** - For the development server output
3. **Video Output Tab** - For viewing the live application

## Quick Start

### Method 1: Using VS Code Tasks (Recommended)

1. **Open Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)

2. **Run Task**: Type "Tasks: Run Task" and select it

3. **Choose Task**:
   - **"Start Full Development Environment"** - Starts both backend and frontend servers in split terminals
   - **"Start Backend Server"** - Starts only the Express backend server
   - **"Start Frontend Dev Server"** - Starts only the Vite frontend dev server

4. **Open Video Output Tab**: 
   - **Standard**: Open `preview.html` in VS Code (compact 36px header)
   - **Minimal**: Open `preview-minimal.html` for ultra-compact view (24px header)
   - Right-click and select "Open with Live Server" or "Open in Browser"
   - Or use the Simple Browser: `Ctrl+Shift+P` → "Simple Browser: Show" → Enter `file:///${workspaceFolder}/preview.html`

### Method 2: Manual Terminal Commands

#### Option A: Run Everything in One Terminal
```bash
npm run dev:full
```

#### Option B: Split Terminals (Recommended)
1. **Terminal 1** (Backend Server):
   ```bash
   npm run server
   ```

2. **Terminal 2** (Frontend Dev Server):
   ```bash
   npm run dev
   ```

3. **Open Video Output**:
   - Open `preview.html` in your browser: `http://localhost:5173` embedded in a viewer

## Panel Layout Recommendations

### Layout 1: Side-by-Side
```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│   Code Editor           │   preview.html          │
│                         │   (Video Output)        │
│                         │                         │
├─────────────────────────┴─────────────────────────┤
│   Terminal 1: Backend  │  Terminal 2: Frontend   │
└────────────────────────┴─────────────────────────┘
```

To set up this layout:
1. Open your code files in the editor
2. Split editor right (`Ctrl+\` or `Cmd+\`)
3. Open `preview.html` in the right pane
4. Toggle terminal panel (`Ctrl+` ` or `Cmd+` `)
5. Split terminal (`Ctrl+Shift+5` or `Cmd+Shift+5`)

### Layout 2: Stacked
```
┌───────────────────────────────────────────────────┐
│             Code Editor                           │
│                                                   │
├───────────────────────────────────────────────────┤
│             preview.html (Video Output)           │
│                                                   │
├─────────────────────────┬─────────────────────────┤
│   Terminal 1: Backend  │  Terminal 2: Frontend   │
└────────────────────────┴─────────────────────────┘
```

## What Each Panel Does

### Terminal Panels
- **Backend Terminal**: Runs the Express server on port 4000
  - Handles GitHub API requests
  - Manages git worktrees
  - Proxies preview sessions
  - Shows server logs and errors

- **Frontend Terminal**: Runs the Vite dev server on port 5173
  - Hot module replacement (HMR)
  - Fast refresh for React components
  - Shows build warnings and errors

### Video Output Tab

**Two versions available:**

#### preview.html (Compact)
- **36px header** - Compact controls with full labels
- **Collapsible to 28px** - Click [⇕] button to minimize
- Remembers your size preference
- Responsive design for narrow viewports
- Includes controls: Reload [↻], Open in Browser [🌐], DevTools [🔧], Toggle Size [⇕]

#### preview-minimal.html (Ultra-minimal)
- **24px header** - Minimal controls, icon-only buttons
- **Can hide completely** - Click [⊝] or double-click anywhere
- Semi-transparent header (becomes opaque on hover)
- Maximum space for preview
- Perfect for side-by-side split views

**Both versions:**
- Display the live running application in an iframe
- Auto-detect when servers are ready
- Show connection status
- Auto-reconnect if server restarts

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Backend Server | 4000 | http://localhost:4000 |
| Frontend Dev Server | 5173 | http://localhost:5173 |
| Preview Sessions | Dynamic | Allocated by backend |

## Troubleshooting

### Servers Not Starting
1. Check if ports 4000 and 5173 are available
2. Close any processes using these ports:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :4000
   netstat -ano | findstr :5173
   
   # Linux/Mac
   lsof -i :4000
   lsof -i :5173
   ```

### Preview.html Shows "Server Not Responding"
1. Make sure both servers are running
2. Check terminal logs for errors
3. Try accessing http://localhost:5173 directly in your browser
4. Click "Retry" in the preview.html interface

### Hot Reload Not Working
1. Make sure you're running `npm run dev` (not `npm run build`)
2. Check Vite terminal for errors
3. Try refreshing the browser/preview

### Backend API Errors
1. Check `.env.local` file exists with required variables
2. Verify GITHUB_TOKEN is valid
3. Check backend terminal for detailed error messages

## VS Code Extensions (Recommended)

- **Live Server**: For serving preview.html with auto-reload
- **Error Lens**: Inline error display
- **ESLint**: Code quality
- **Prettier**: Code formatting

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Split Terminal | `Ctrl+Shift+5` | `Cmd+Shift+5` |
| Toggle Terminal | `Ctrl+` ` | `Cmd+` ` |
| Split Editor | `Ctrl+\` | `Cmd+\` |
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Quick Open | `Ctrl+P` | `Cmd+P` |

## Tips

1. **Use Tasks**: The VS Code tasks automatically handle server startup and provide proper problem matchers

2. **Keep preview.html Open**: It provides a dedicated view of your running app separate from the code

3. **Monitor Both Terminals**: Backend and frontend errors appear in different terminals

4. **Use Simple Browser**: VS Code's Simple Browser keeps everything in one window:
   ```
   Ctrl+Shift+P → Simple Browser: Show → http://localhost:5173
   ```

5. **Save Window Layout**: VS Code saves your panel layout between sessions

## Advanced: Custom Tasks

You can add custom tasks to `.vscode/tasks.json`:

```json
{
  "label": "Clean Workspaces",
  "type": "shell",
  "command": "rm",
  "args": ["-rf", "workspaces/*/sessions/*"],
  "presentation": {
    "reveal": "always"
  }
}
```

## Need Help?

- Check `QUICK_START.md` for initial setup
- Review `README.md` for project overview
- Check terminal logs for error details
- Open Developer Tools in the preview for client-side debugging

