# Server Info Display - User Guide

## What Was Added

A new **Server Info** component has been added to the application header that displays clickable server endpoints.

### Header Layout (Left to Right)
```
[GitHub Icon] [Title] [Server Info] [Repo Input]
```

### Server Info Display
```
📡 Server: [http://localhost:4000]  🔌 Port: [4000]
```

- **Blue Button (Server)**: Shows the public server URL
  - Click to open `http://localhost:4000` in a new tab
  - Useful for accessing API endpoints directly

- **Green Button (Port)**: Shows the port number
  - Click to open `http://localhost:4000` in a new tab
  - Quick access to the server

## Features

✅ **Automatic on App Start**
- Server info is fetched and displayed immediately when the app loads

✅ **Clickable Endpoints**
- Both the server URL and port number are clickable buttons
- Click opens the endpoint in a new browser tab
- Useful for testing API endpoints, checking server status, etc.

✅ **Loading State**
- Shows "🔄 Loading..." while fetching server config
- Shows "⚠️ Server info unavailable" if there's an error

✅ **Responsive Styling**
- Styled with hover effects (darker colors on hover)
- Uses Tailwind CSS for consistent theming
- Monospace font for the endpoint URLs

## Backend Implementation

### New Endpoint: `GET /api/config`
Returns server configuration as JSON:
```json
{
  "port": 4000,
  "publicUrl": "http://localhost:4000",
  "timestamp": "2025-10-29T12:34:56.789Z"
}
```

This endpoint is called once when the app mounts to populate the ServerInfo component.

## Technical Details

### Files Modified:
1. **server/index.ts**
   - Added `/api/config` endpoint that returns port and URL info

2. **services/api.ts**
   - Added `getServerConfig()` function to fetch server configuration

3. **App.tsx**
   - Imported ServerInfo component
   - Added ServerInfo to header JSX

4. **components/ServerInfo.tsx** (NEW)
   - React component that fetches and displays server info
   - Handles loading and error states
   - Provides clickable buttons to open endpoints

## Visual Layout

When the app loads, you'll see in the header:
```
┌──────────────────────────────────────────────────────────────┐
│ [GitHub Icon]                                                │
│ GitHub Commit Workspace Runner  📡 Server: [localhost:4000]  │
│                                 🔌 Port: [4000]              │
│                                           [Search Repo Input]  │
└──────────────────────────────────────────────────────────────┘
```

- Hover over buttons to see color change and tooltip
- Click either button to open the server endpoint in a new tab

## Usage Tips

1. **Quick API Testing**: Click the server URL to test endpoints in browser
2. **Port Reference**: Always know which port the server is running on
3. **Multi-Server Setup**: If you have multiple servers, this helps identify which one you're connected to
4. **Troubleshooting**: If buttons are greyed out, the server might not be responding to /api/config

## How It Works

1. When the React app mounts, `ServerInfo` component is rendered
2. `useEffect` hook triggers `getServerConfig()` API call
3. Backend responds with port and public URL
4. Component displays two clickable buttons
5. Clicking either button opens the endpoint in a new tab
