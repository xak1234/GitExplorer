# Bundle & Startup Guide

This guide explains how to build and run both the frontend and backend together.

## Quick Start

### Development Mode (Recommended for Development)
Run both frontend and backend concurrently with hot reload:

```bash
npm run start:dev
# or
npm run dev:all
# or
npm run dev:full
```

This starts:
- **Frontend (Vite)** on `http://localhost:5173` with hot module reloading
- **Backend (Express)** on `http://localhost:4000` with API endpoints

### Production Mode (Recommended for Deployment)
Build the frontend and serve it from the backend:

```bash
npm run start:prod
# or
npm run start
```

This:
1. Builds the React frontend using Vite → `dist/public/`
2. Starts the Express backend on `http://localhost:4000`
3. Backend serves the built frontend as static files
4. **Single server** on port 4000 serves both frontend and backend

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start only frontend (Vite dev server) |
| `npm run server` | Start only backend (Express) |
| `npm run dev:all` | Start both concurrently (development) |
| `npm run build` | Build frontend for production → `dist/public/` |
| `npm start` | Build frontend + start backend (production) |
| `npm run bundle` | Build both frontend and backend |

## File Structure

```
project/
├── index.tsx                 # Frontend entry point
├── App.tsx                   # Frontend app component
├── components/               # React components
├── server/
│   └── index.ts             # Backend Express server
├── dist/
│   ├── public/              # Built frontend (after npm run build)
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   └── server/              # Compiled backend (optional)
├── vite.config.ts           # Vite config (builds to dist/public)
├── package.json             # NPM scripts and dependencies
└── scripts/
    ├── start.js             # Unified startup script
    ├── start-prod.ps1       # PowerShell production script
    └── start-prod.sh        # Bash production script
```

## How It Works

### Development Mode
- Vite dev server runs on port 5173 with hot reload
- Express backend runs on port 4000
- Frontend proxies API calls to backend (both on localhost)
- Browser loads from `http://localhost:5173`

### Production Mode
- Frontend is pre-built and bundled into `dist/public/`
- Express backend serves:
  - Static files from `dist/public/` (frontend)
  - API endpoints on `/api/*`
  - SPA routing (index.html fallback)
- **Single port** (4000) serves everything
- Better for deployment, no separate dev servers needed

## Building for Production

### Step 1: Build Frontend
```bash
npm run build
```
Output: `dist/public/` with optimized HTML, CSS, JS bundles

### Step 2: Start Server
```bash
npm run server
```
Or in one command:
```bash
npm start
```

### Step 3: Access Application
Open browser to `http://localhost:4000`

## Environment Variables

Create `.env.local` file in root:

```env
# GitHub API
GITHUB_TOKEN=ghp_your_token_here

# Backend Server
PORT=4000
SERVER_PORT=4000
PUBLIC_SERVER_URL=http://localhost:4000

# Workspace
WORKSPACE_ROOT=./workspaces
```

## Port Configuration

- **Development**: Frontend 5173, Backend 4000
- **Production**: Frontend + Backend 4000

To change the backend port, set `PORT` environment variable:
```bash
PORT=3000 npm run server
```

## Frontend Static Serving

The backend automatically serves static files from `dist/public/` if it exists:

1. Falls back to `index.html` for SPA routing (client-side routes work)
2. Serves other static assets (CSS, JS, images)
3. All `/api/*` calls still route to backend endpoints

## Notes

- Always run `npm run build` before deploying
- The `dist/` folder should not be committed to git (usually in .gitignore)
- For development, `npm run dev:all` is better for debugging
- For production/deployment, `npm start` is recommended
- The PAT modal in the frontend stores the token in browser localStorage

## Troubleshooting

### "Frontend not built" error
Run `npm run build` first, then `npm start`

### Port already in use
Kill the process on port 4000 or use a different port:
```bash
PORT=5000 npm run server
```

### Vite port conflicts
If 5173 is taken, Vite will try 5174, 5175, etc.

### API calls failing in production
Make sure `PUBLIC_SERVER_URL` environment variable matches where the app is hosted
