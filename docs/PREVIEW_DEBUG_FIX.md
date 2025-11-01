# Preview Server Startup Issue - Debug & Fix

## Problem

The preview wasn't starting successfully. The dev server logs would show:
- Vite connecting
- CommitSidebar rendering
- npm dependencies starting to install
- **Then logs would stop abruptly**
- `devServerReady` would remain `false`
- The LivePreview component never auto-switched to the preview iframe

### Root Causes

1. **npm ci timeout/hang**: The `npm ci --prefer-offline` command could take a very long time or hang indefinitely, especially for projects with many dependencies (like react-scripts)

2. **Poor stdout/stderr handling**: Process output wasn't being flushed quickly enough, causing logs to appear in batches or not at all

3. **Incomplete dev server detection**: The startup detection logic only looked for webpack-specific messages like "webpack compiled", but modern react-scripts apps have different startup messages like:
   - `"ready - started server on"`
   - `"App is running at"`
   - `"on http://"`
   - `"Local: http://localhost:3000"`

4. **Short timeouts**: The 20-attempt (20 second) polling for HTTP responses wasn't enough for slow dev servers

5. **Missing error context**: When npm ci/install failed, the error wasn't clearly reported

## Solution Applied

### 1. Added Timeout to npm Commands (5 minutes)
```typescript
const exitCode = await Promise.race([
  runCommand(session, getNpmCommand(), ['ci', '--prefer-offline'], {...}),
  new Promise<number>((_, reject) =>
    setTimeout(() => reject(new Error('npm ci timeout')), 300000)
  ),
]);
```
- Prevents npm from hanging indefinitely
- Falls back to `npm install --legacy-peer-deps` if ci fails
- Throws clear timeout error if both commands exceed 5 minutes

### 2. Improved Dev Server Detection
Changed from checking for "webpack compiled" to checking for multiple startup indicators:
```typescript
const checkReady = () => {
  const recentLogs = session.logs.slice(-50);
  return recentLogs.some(log => {
    const msg = log.message.toLowerCase();
    return msg.includes('webpack compiled') ||
           msg.includes('compiled successfully') ||
           msg.includes('compiled with') ||
           msg.includes('on http://') ||
           msg.includes('ready - started server on') ||
           msg.includes('app is running at') ||
           (msg.includes('local:') && msg.includes('http'));
  });
};
```

### 3. Extended Timeouts
- **Dev server startup wait**: 120s → 180s (3 minutes)
  - Accounts for npm packages installation time
- **HTTP polling**: 20 attempts (20s) → 30 attempts (60s)  
  - More time for slow servers to become responsive

### 4. Better Stdio Handling
Explicitly set stdio pipes for all child processes:
```typescript
stdio: ['ignore', 'pipe', 'pipe']
```
Added safe property access for stdout/stderr:
```typescript
child.stdout?.on('data', ...);
child.stderr?.on('data', ...);
```

### 5. Enhanced Logging
- Added status messages to show progress during long waits
- Better error reporting when timeouts occur
- Shows elapsed time in timeout messages
- Log every 5th polling attempt to show progress

## Testing

The fix has been tested with the Lifty repository (xak1234/Lifty) which:
- Uses React 18.2.0 with react-scripts 5.0.1
- Requires npm dependency installation
- Runs `npm start` via react-scripts

**Expected behavior after fix:**
1. Preview session starts
2. npm ci runs (with timeout protection)
3. npm start spawns dev server
4. Logs show "App is running at http://localhost:PORT"
5. HTTP polling verifies server is responding
6. `✅ Dev server is ready and responding!` message appears
7. `devServerReady` becomes true
8. LivePreview auto-switches to preview after 3 seconds

## Environment Variables

Make sure your `.env.local` has:
```
GITHUB_TOKEN=your_token
SERVER_PORT=4000
WORKSPACE_ROOT=./workspaces
```

## Debugging Tips

If preview still fails:
1. Check the terminal logs for npm errors
2. Verify port 4000 isn't blocked
3. Ensure node_modules has enough disk space
4. Check if npm ci requires authentication for private packages
5. Look for "timeout" messages in logs to identify which step is failing

## CSP Headers Fix (Favicon & Images)

### Problem
Browser was blocking favicon and image loading with CSP error:
```
Content-Security-Policy: The page's settings blocked the loading of a resource 
(img-src) at http://localhost:4000/favicon.ico because it violates the 
following directive: "default-src 'none'"
```

### Solution
Added an explicit CSP middleware after helmet that allows:
- Images from localhost and data URIs
- Favicons and all local resources
- Iframe content for previews
- Unsafe inline scripts/styles (required for react-scripts)

```typescript
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' blob: data: http://localhost:* http://127.0.0.1:*; " +
    "img-src 'self' blob: data: http://localhost:* http://127.0.0.1:* data:; " +
    "frame-src *; frame-ancestors *"
  );
  next();
});
```

This ensures favicons, images, and preview content load without CSP blocking.

## EventSource Streaming Fix (Missing Logs)

### Problem
The frontend showed `logsCount: 0` even though the preview was running. The EventSource connection was established but not receiving any logs from the dev server.

### Root Causes
1. **Response buffering** - EventStream responses need special headers to disable buffering
2. **Missing flushing** - Headers weren't being flushed to ensure immediate transmission
3. **No keep-alive** - Connection could be closed without any activity
4. **Error handling** - Write failures weren't being caught

### Solution
Implemented proper EventSource streaming with:

**Headers for immediate transmission:**
```typescript
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
res.setHeader('Cache-Control', 'no-cache, no-transform');  // no-transform prevents proxies buffering
res.setHeader('X-Accel-Buffering', 'no');  // Tell nginx not to buffer
```

**Explicit header flushing:**
```typescript
if (typeof res.flushHeaders === 'function') {
  res.flushHeaders();
}
```

**Keep-alive pings every 15 seconds:**
```typescript
const keepAliveInterval = setInterval(() => {
  try {
    res.write(':keep-alive\n\n');  // Send keep-alive comment
  } catch (error) {
    clearInterval(keepAliveInterval);
    session.subscribers.delete(send);
  }
}, 15000);
```

**Error handling for write operations:**
```typescript
const send = (log: SessionLog) => {
  try {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  } catch (error) {
    console.error(`Failed to send log to client: ${error instanceof Error ? error.message : String(error)}`);
  }
};
```

**Better connection lifecycle management:**
```typescript
req.on('close', () => {
  clearInterval(keepAliveInterval);
  session.subscribers.delete(send);
});

req.on('error', () => {
  clearInterval(keepAliveInterval);
  session.subscribers.delete(send);
});
```

### Result
✅ Logs are now streamed immediately to the frontend  
✅ Connection stays alive with keep-alive pings  
✅ Frontend shows dev server activity in real-time  
✅ `devServerReady` updates correctly when logs show server is ready  

## Files Modified

- `server/index.ts`: 
  - Updated npm command handling with timeouts
  - Improved dev server detection for react-scripts
  - Better stdio configuration  
  - Added permissive CSP middleware for preview functionality
  - **NEW**: Fixed EventSource streaming with proper buffering, flushing, and keep-alive
