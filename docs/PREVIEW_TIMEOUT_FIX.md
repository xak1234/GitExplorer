# ⚠️ Preview Timeout Fix Required

## The Problem

You're seeing this error when trying to start a preview:
```
❌ Failed to start preview: Request aborted
Error: ECONNABORTED
```

This happens because **the backend server needs to be restarted** to apply recent code changes.

## ✅ Quick Fix (Follow These Steps)

### Step 1: Stop the Backend Server

In the terminal window running the backend server, press:
```
Ctrl + C
```

### Step 2: Restart the Backend Server

```bash
npm run server
```

Wait for this message:
```
🎉 Server ready!
📡 Server listening on: http://localhost:4000
```

### Step 3: Refresh the Frontend

In your browser:
```
Ctrl + Shift + R  (hard refresh)
```
Or just press `F5`

### Step 4: Try Preview Again

1. Select a commit from the sidebar
2. Click the green play button (▶️)
3. **Wait patiently** - first-time setup takes 2-5 minutes

## What Changed?

Recent code updates:

1. ✅ **Re-enabled dev server support** - Projects now start their dev servers (Vite, React Scripts, etc.)
2. ✅ **Increased timeouts** - API now waits up to 5 minutes for operations
3. ✅ **Better error messages** - More informative timeout errors

## Why Did It Break?

The backend server was running **old code** that had dev servers disabled. The new code fixes this, but TypeScript/Node needs a restart to load the changes.

## Still Getting Timeouts?

If you're still seeing timeouts after restarting:

### Cause 1: Repository is Very Large
**Solution**: Try a smaller repository first (e.g., a simple React app)

### Cause 2: Slow Network/npm Install Taking Too Long
**Symptoms**: 
- First time installing a repo with many dependencies
- `npm install` can take 5-10 minutes for large projects

**Solution**: 
- Be more patient (some repos take 10+ minutes on first run)
- Check backend terminal - you'll see "Installing npm dependencies..."
- Watch the logs panel for progress

### Cause 3: Backend Server Not Running Updated Code
**Check**: Look at the backend terminal when starting a preview. You should see:
```
📦 Found package.json for: project-name
✅ Using 'dev' script
```

If you see:
```
📂 Will serve static files from commit (no compilation)
```
Then the old code is still running - **restart the backend server again**.

## Quick Test

Try previewing a simple repository first:
```
https://github.com/xak1234/Lifty
```

This is a smaller project that should start faster.

## Backend Terminal Checklist

When starting a preview, your backend terminal should show:
```
✅ Marks to look for:
  - "📦 Found package.json for: [project-name]"
  - "Installing npm dependencies (npm ci --prefer-offline)..."
  - "✅ Dependencies installed."
  - "Starting development server (npm run dev)..."
  - "✅ Dev server is ready and responding!"

❌ Don't see these? Restart the backend server.
```

## Need More Help?

1. **Check both terminals** (backend + frontend) for error messages
2. **Look at the Logs panel** in the Workspace Controls sidebar
3. **Try a different/smaller repository** to test
4. **Increase timeout even more** if needed (edit `services/api.ts`)

---

## For Reference: What the Fix Does

### Before (Broken)
- ❌ Dev servers were disabled
- ❌ Only served raw static files
- ❌ React/Vite apps couldn't run

### After (Fixed)
- ✅ Detects package.json scripts
- ✅ Starts appropriate dev server (`npm run dev`, `npm start`, etc.)
- ✅ Waits up to 5 minutes for everything to complete
- ✅ Shows progress in logs

---

**TL;DR**: Restart your backend server with `npm run server` 🚀

