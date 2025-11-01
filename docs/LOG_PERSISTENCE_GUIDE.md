# Log Persistence & Download Feature

## ✨ What's New

The LogViewer now has **persistent logs** that don't get cleared, plus tools to download and manage them.

### Features Added

#### 1. **Automatic Log Persistence** 📝
- Logs are automatically saved to browser localStorage
- Persists logs even after sessions end
- Stores up to 1000 most recent logs (to avoid storage limits)
- Automatically loads previous logs when app restarts

#### 2. **Download Logs** 📥
- Click **"📥 Download"** button to save logs as a `.txt` file
- File is named with timestamp: `logs-2025-10-29T23-04-36.txt`
- Contains full timestamp and log level for each line
- Format: `[ISO-TIMESTAMP] [LOG_LEVEL] message`

#### 3. **Clear Logs** 🗑️
- Click **"🗑️ Clear"** button to manually clear all logs
- Shows confirmation dialog to prevent accidental deletion
- Only you control when logs are cleared (not automatic)

---

## 📍 Where to Find It

In the **Workspace Controls** panel (right sidebar):

```
┌─ Workspace Controls ──────────────┐
│ ⚫ Stopped                         │
│ SHA: abc123...                     │
│                                   │
│ ▶ Start Preview  ◼ Stop Workspace │
│                                   │
│ Logs                              │
│ ┌─────────────────────────────┐  │
│ │ [11:22:30] INFO message     │  │
│ │ [11:22:31] SUCCESS message  │  │
│ │ ...                         │  │
│ └─────────────────────────────┘  │
│ ┌─────────────────────────────┐  │
│ │ 📥 Download    🗑️ Clear     │  │
│ └─────────────────────────────┘  │
└───────────────────────────────────┘
```

---

## 🎯 How It Works

### On App Load:
1. App checks browser localStorage for saved logs
2. If found, loads and displays them
3. New logs are appended to the persisted logs

### During Session:
1. New logs arrive from server
2. All logs (old + new) are saved to localStorage
3. Display updates in real-time

### When Session Ends:
1. ✅ Logs remain visible (NOT cleared)
2. ✅ Logs stay in localStorage
3. ✅ User can download or clear them manually

---

## 💾 Storage Details

- **Storage Method:** Browser localStorage
- **Storage Limit:** ~5MB per domain (browser-dependent)
- **Logs Kept:** Up to 1000 most recent logs
- **Auto-cleanup:** Old logs are discarded when limit reached
- **Persistence:** Survives page refresh, browser restart
- **Scope:** Local to your device only

---

## 📥 Download Log Format

When you click download, you get a text file with this format:

```
[2025-10-29T23:04:36.789Z] [INFO] 🚀 Starting preview for: xak1234/Lifty
[2025-10-29T23:04:36.900Z] [INFO] 📋 Parsed repository: xak1234/Lifty
[2025-10-29T23:04:37.100Z] [SUCCESS] ✅ Repository synchronized
[2025-10-29T23:04:38.200Z] [ERROR] ❌ Failed to start process
[2025-10-29T23:04:39.300Z] [LOG] npm: Package installation complete
```

Great for:
- 📊 Analyzing what went wrong
- 📧 Sharing logs in issues/reports
- 📚 Keeping a record of sessions
- 🔍 Debugging problems

---

## 🎯 Usage Tips

### Troubleshooting:
1. Click **Download** to save logs
2. Open the `.txt` file in your editor
3. Search for `ERROR` or `CRITICAL` keywords
4. Look for the exact failure point

### Keeping Logs:
- Logs auto-persist - no action needed
- Manual **Clear** only when you want to start fresh
- Previous logs stay in localStorage

### Clearing Space:
- Click **Clear** to remove all logs from storage
- Or localStorage is cleared when you clear browser data

---

## ⚙️ Technical Details

### Implementation:
- **Component:** `components/LogViewer.tsx`
- **Storage Key:** `sessionLogs`
- **State Management:** React useState with localStorage sync
- **Auto-save:** Triggers on each log update

### Limitations:
- localStorage limited to ~5MB
- Browser-specific (not synced across devices)
- Cleared if user clears browser cache
- Can't exceed ~1000 logs (most recent kept)
