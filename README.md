

# GitHub Commit Workspace Runner

This application connects to any GitHub repository, lists real commits via the GitHub REST API, lets you browse the repository file tree at any commit, and prepares a local workspace so you can inspect that snapshot through a live preview served from your machine.

## Prerequisites

- Node.js 18+
- npm
- Git (required for cloning and worktree management)
- **Required**: A GitHub Personal Access Token (PAT) with `repo` scope for accessing private repositories

### Setting Up GitHub Token for Private Repository Access

1. **Generate a Personal Access Token:**
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Select the `repo` scope (full control of private repositories)
   - Copy the generated token

2. **Configure the token:**
   - Copy `env.example` to `.env.local`
   - Set your token: `GITHUB_TOKEN=your_token_here`
   - The application will validate your token on startup

## Getting Started

1. Install dependencies

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` and set your GitHub token:
   ```bash
   GITHUB_TOKEN=your_github_token_here
   ```

   **Available configuration options:**
   - `GITHUB_TOKEN` - **Required** for private repository access
   - `SERVER_PORT` - Server port (default: 4000)
   - `WORKSPACE_ROOT` - Local workspace directory (default: ./workspaces)
   - `PUBLIC_SERVER_URL` - Public server URL (default: http://localhost:4000)
   - `ALLOWED_GITHUB_ORGS` - Comma-separated list of allowed GitHub orgs (optional)
   - `MAX_FILE_SIZE` - Maximum file size for content fetching (default: 1MB)
   - `RATE_LIMIT_MAX_REQUESTS` - Rate limit per minute (default: 60)
   - `SESSION_TIMEOUT_MINUTES` - Session timeout (default: 60)

3. Start both the backend workspace server and the Vite frontend

   ```bash
   npm run dev:full
   ```

   This runs the workspace server on port `4000` by default and the frontend on Vite’s default port (`5173`). You can also run them separately with `npm run server` and `npm run dev`.

4. Open the frontend (reported by Vite) and connect to any GitHub repository URL (e.g. `https://github.com/owner/repo`).

5. Select a commit, browse its files, prepare a workspace, and launch the preview to serve that commit snapshot from the controlled workspace directory (`workspaces/` by default).

## Security Features

This application includes several security measures for safe private repository access:

### 🔐 **Authentication & Authorization**
- GitHub Personal Access Token validation on startup
- Repository access verification before any operations
- Optional organization-based access restrictions
- Secure credential handling (tokens never logged or exposed)

### 🛡️ **Input Validation & Sanitization**
- Repository URL validation and sanitization
- Commit SHA format validation (40-character hex)
- File path validation with path traversal prevention
- Request size limits and file size restrictions

### 🚦 **Rate Limiting & Resource Management**
- API rate limiting (relaxed for localhost)
- Session timeout and automatic cleanup
- Memory-efficient file handling
- Process isolation for workspace operations

### 🔒 **Network Security**
- Security headers (helmet.js)
- CORS configuration for local development
- Request logging and error handling
- No sensitive data in error responses

### 📁 **File System Security**
- Workspace isolation using Git worktrees
- Path traversal prevention
- Automatic cleanup of temporary files
- Secure file serving with proper MIME types

## Workspace Lifecycle

- **Prepare Workspace** clones or updates the selected repository, checks out the chosen commit into an isolated Git worktree, and streams real-time logs describing those actions.
- **Start Preview** detects if the repository has an `npm start` script and runs it with proper environment variables, or falls back to serving static files. The preview is accessible through the backend proxy which handles MIME types and asset serving correctly.
- **Stop Workspace** cleans up the worktree and terminates any running preview processes.

All data is fetched directly from the GitHub API—no mock data involved.

## Troubleshooting

- **MIME type errors**: The server automatically sets correct MIME types for common file extensions and fixes issues with development servers that might serve CSS files as HTML.
- **Asset loading issues**: The server configures environment variables to ensure assets are served from the correct paths and disables problematic development features like hot reloading.
- **Port conflicts**: The server automatically finds free ports for preview processes and proxies requests through the main server to avoid CORS issues.
