import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import axios from 'axios';
import { simpleGit } from 'simple-git';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import validator from 'validator';

type LogType = 'info' | 'success' | 'error' | 'log';

interface SessionLog {
  timestamp: string;
  message: string;
  type: LogType;
}

interface Session {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  sha: string;
  repoPath: string;
  worktreePath: string;
  status: 'preparing' | 'prepared' | 'running' | 'stopped' | 'error';
  previewUrl: string | null;
  logs: SessionLog[];
  subscribers: Set<(log: SessionLog) => void>;
  process: ChildProcess | null;
  port: number | null;
  dependenciesInstalled: boolean;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sha: string;
  size: number | null;
  children?: FileTreeNode[];
}

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

// Security and configuration constants
const app = express();
const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 4000);
const PUBLIC_SERVER_URL = process.env.PUBLIC_SERVER_URL ?? `http://localhost:${PORT}`;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? path.join(process.cwd(), 'workspaces');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 60);
const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES ?? 1);
const ALLOWED_GITHUB_ORGS = process.env.ALLOWED_GITHUB_ORGS?.split(',').map(org => org.trim()).filter(Boolean) || [];
const BASE_GITHUB_USER = process.env.BASE_GITHUB_USER ?? 'xak1234';
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE ?? 1048576); // 1MB default
const SESSION_TIMEOUT_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 60);

// GitHub token is now optional - can be provided via browser PAT modal
// If not set, the server will still run but with lower GitHub API rate limits
if (!GITHUB_TOKEN) {
  console.warn('⚠️  WARNING: GITHUB_TOKEN not set in environment');
  console.warn('   The application will work with lower GitHub API rate limits');
  console.warn('   For better experience, either:');
  console.warn('   1. Set GITHUB_TOKEN in .env.local, OR');
  console.warn('   2. Use the key icon in the app to enter your PAT (stored in browser)');
  console.warn('');
}

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  },
  timeout: 15_000,
});

// Add interceptor to use token from request headers if provided
githubClient.interceptors.request.use((config) => {
  // This will be set by middleware before API calls
  return config;
});

// OpenAI client for AI-based analysis
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openaiClient = OPENAI_API_KEY ? axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
}) : null;

// Local LLM client for AI-based analysis (Ollama or compatible API)
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL ?? 'http://192.168.0.15:1234';
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL ?? 'mistral-7b-instruct-v0.3';
const localLlmClient = axios.create({
  baseURL: LOCAL_LLM_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120_000, // Local LLM might be slower
});

console.log(`🤖 Local LLM configured: ${LOCAL_LLM_URL} (model: ${LOCAL_LLM_MODEL})`);

const repoLocks = new Map<string, Promise<void>>();
const sessions = new Map<string, Session>();
const DEFAULT_FAVICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

function sanitizeRelativePath(relativePath: string): string {
  // SECURITY: Remove environment variable placeholders and sanitize path
  let cleaned = relativePath
    .replace(/%PUBLIC_URL%/g, '')
    .replace(/%REACT_APP_[^/]+%/g, '')
    .replace(/%VITE_[^/]+%/g, '')
    .replace(/[<>"|?*\x00-\x1f]/g, ''); // Remove invalid filename characters

  // Normalize and prevent directory traversal
  const normalized = path
    .normalize(cleaned)
    .replace(/^(\.\.(?:\\|\/|$))+/, '')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');

  // Additional security check
  if (normalized.includes('..') || /[\x00-\x1f\x7f-\x9f]/.test(normalized)) {
    return '';
  }

  return normalized;
}

function applyRelaxedPreviewHeaders(res: Response) {
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');

  const directives = [
    "default-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: http://localhost:* http://127.0.0.1:* https:",
    "style-src 'self' 'unsafe-inline' blob: data: http://localhost:* http://127.0.0.1:* https:",
    "img-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:",
    "media-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:",
    "font-src 'self' data: blob: http://localhost:* http://127.0.0.1:* https:",
    "connect-src *",
    "frame-src *",
    "frame-ancestors *",
  ];

  res.setHeader('Content-Security-Policy', directives.join('; '));
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

async function proxySessionAsset(req: Request, res: Response, session: Session, safeRelative: string): Promise<boolean> {
  if (!session.port) {
    console.log(`   ❌ Cannot proxy - no port allocated`);
    return false;
  }

  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.substring(queryIndex) : '';
  const normalizedSlashPath = safeRelative ? `/${safeRelative.split(path.sep).join('/')}` : '/';
  const targetUrl = new URL(`${normalizedSlashPath}${query}`, `http://127.0.0.1:${session.port}`);

  console.log(`   🔄 Proxying: ${req.originalUrl} -> ${targetUrl.href}`);

  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    console.log(`   ✅ Proxy response: ${response.status} ${response.statusText}`);
    res.status(response.status);
    applyRelaxedPreviewHeaders(res);

    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();

      if (['content-length', 'transfer-encoding', 'connection', 'content-encoding'].includes(lower)) {
        return;
      }

      if (lower === 'content-security-policy') {
        let modifiedCSP = value;
        modifiedCSP = modifiedCSP.replace(/frame-ancestors[^;]*;?/gi, '');
        modifiedCSP = modifiedCSP.replace(/;\s*$/, '');
        if (modifiedCSP.trim()) {
          res.setHeader(key, modifiedCSP);
        }
        return;
      }

      if (lower === 'x-frame-options') {
        return;
      }

      if (lower === 'content-type') {
        if (safeRelative.endsWith('.css')) {
          res.setHeader(key, 'text/css; charset=utf-8');
        } else if (safeRelative.endsWith('.js') || safeRelative.endsWith('.mjs')) {
          res.setHeader(key, 'application/javascript; charset=utf-8');
        } else if (safeRelative.endsWith('.json')) {
          res.setHeader(key, 'application/json; charset=utf-8');
        } else if (safeRelative.endsWith('.html')) {
          res.setHeader(key, 'text/html; charset=utf-8');
        } else if (safeRelative.endsWith('.tsx') || safeRelative.endsWith('.ts')) {
          res.setHeader(key, 'application/javascript; charset=utf-8');
        } else {
          res.setHeader(key, value);
        }
      } else {
        res.setHeader(key, value);
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
    return true;
  } catch (error) {
    console.log(`   ❌ Proxy failed: ${(error as Error).message}`);
    appendLog(session, `Failed to proxy preview request for ${normalizedSlashPath}: ${(error as Error).message}`, 'error');
    return false;
  }
}

// Security middleware - configured for local development with preview functionality
app.use(helmet({
  contentSecurityPolicy: false,  // Custom CSP set below for iframe previews
  frameguard: false,              // Disable X-Frame-Options for iframe previews
  crossOriginEmbedderPolicy: false,
  hsts: false,                    // Disable HSTS for local development
  noSniff: true,                  // Prevent MIME type sniffing
  xssFilter: true,                // Enable XSS filter
  hidePoweredBy: true,            // Hide X-Powered-By header
}));

// Explicitly set permissive CSP for all routes to allow favicons, images, and preview content
app.use((req: Request, res: Response, next: NextFunction) => {
  // Allow favicons, images, and all preview content
  res.setHeader('Content-Security-Policy',
    "default-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: http://localhost:* http://127.0.0.1:* https:; " +
    "style-src 'self' 'unsafe-inline' blob: data: http://localhost:* http://127.0.0.1:* https:; " +
    "img-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:; " +
    "media-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https:; " +
    "font-src 'self' data: blob: http://localhost:* http://127.0.0.1:* https:; " +
    "connect-src *; frame-src *; frame-ancestors *"
  );
  next();
});

// Relaxed rate limiting for local use
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: RATE_LIMIT_MAX_REQUESTS * 2, // More generous for local use
  message: {
    error: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

app.use(limiter);

// CORS configuration for local development
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5175',  // Support Vite port 5175
    'http://127.0.0.1:5175',  // Support Vite port 5175
    'http://localhost:3000',  // Support legacy port
    'http://127.0.0.1:3000',  // Support legacy port
    PUBLIC_SERVER_URL
  ],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// Middleware to handle GitHub token from browser
app.use((req: Request, res: Response, next: NextFunction) => {
  const browserToken = req.headers['x-github-token'] as string | undefined;
  if (browserToken) {
    // Update the githubClient with the browser token for this request
    githubClient.defaults.headers.common['Authorization'] = `Bearer ${browserToken}`;
  } else if (GITHUB_TOKEN) {
    // Fall back to environment token
    githubClient.defaults.headers.common['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  } else {
    // No token available
    delete githubClient.defaults.headers.common['Authorization'];
  }
  next();
});

// Serve static files from the public folder (for assets like images)
const publicAssetsPath = path.join(process.cwd(), 'public');
if (existsSync(publicAssetsPath)) {
  console.log(`📁 Serving public assets from: ${publicAssetsPath}`);
  app.use(express.static(publicAssetsPath));
}

// Serve static files from the built frontend in production
const publicPath = path.join(process.cwd(), 'dist', 'public');
if (existsSync(publicPath)) {
  console.log(`📦 Serving static frontend from: ${publicPath}`);
  app.use(express.static(publicPath));
  
  // Fallback to index.html for SPA routing
  app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Frontend not built. Run "npm run build" first.' });
    }
  });
}

// Security validation functions
async function validateGitHubToken(): Promise<{ valid: boolean; scopes: string[]; user: string }> {
  try {
    const response = await githubClient.get('/user');
    const scopes = response.headers['x-oauth-scopes']?.split(', ') || [];
    return {
      valid: true,
      scopes,
      user: response.data.login,
    };
  } catch (error) {
    return { valid: false, scopes: [], user: '' };
  }
}

function validateRepoUrl(repoUrl: string): boolean {
  if (!repoUrl || typeof repoUrl !== 'string') {
    return false;
  }

  // Sanitize and validate URL
  const trimmed = repoUrl.trim();

  // Check for malicious patterns
  if (trimmed.includes('..') || trimmed.includes('<') || trimmed.includes('>')) {
    return false;
  }

  try {
    parseRepoUrl(trimmed);
    return true;
  } catch {
    return false;
  }
}

function validateCommitSha(sha: string): boolean {
  return typeof sha === 'string' && /^[a-f0-9]{40}$/i.test(sha);
}

function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // Prevent path traversal and other malicious patterns
  const normalized = path.normalize(filePath);
  return !normalized.includes('..') &&
    !normalized.startsWith('/') &&
    !normalized.startsWith('\\') &&
    !normalized.includes('<') &&
    !normalized.includes('>') &&
    !normalized.includes('|') &&
    !normalized.includes('&') &&
    !normalized.includes(';') &&
    !normalized.includes('$') &&
    !normalized.includes('`') &&
    !/[\x00-\x1f\x7f-\x9f]/.test(normalized) && // No control characters
    normalized.length < 1000; // Reasonable path length limit
}

async function checkRepositoryAccess(owner: string, repo: string): Promise<boolean> {
  // If specific orgs are configured, check access
  if (ALLOWED_GITHUB_ORGS.length > 0) {
    return ALLOWED_GITHUB_ORGS.includes(owner);
  }

  // Prioritize base user repositories
  if (owner === BASE_GITHUB_USER) {
    console.log(`✅ Accessing base user repository: ${owner}/${repo}`);
  }

  // For local use, we trust the token has appropriate access
  // Just verify the repository exists and is accessible
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}`);
    console.log(`✅ Repository ${owner}/${repo} accessible (${response.data.private ? 'private' : 'public'})`);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        console.log(`❌ Repository ${owner}/${repo} not found or not accessible`);
        return false;
      }
      if (status === 403) {
        console.log(`❌ Access denied to repository ${owner}/${repo}. Check token permissions.`);
        return false;
      }
    }
    console.error(`❌ Error accessing repository ${owner}/${repo}:`, error.message);
    return false;
  }
}

// Session cleanup for security
setInterval(() => {
  const now = Date.now();
  const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    const lastActivity = Math.max(
      ...session.logs.map(log => new Date(log.timestamp).getTime()),
      0
    );

    if (now - lastActivity > timeoutMs) {
      console.log(`Cleaning up expired session: ${sessionId}`);
      cleanupSession(session).catch(console.error);
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

async function ensureDirectory(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function parseRepoUrl(input: string): { owner: string; repo: string } {
  // SECURITY: Sanitize and validate repository URL input
  const trimmed = input.trim().substring(0, 500); // Limit length
  
  // Remove dangerous characters
  if (/[<>"|;$`\\]/.test(trimmed)) {
    throw new Error('Invalid characters in repository URL');
  }

  const sshMatch = trimmed.match(/^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#.*)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/, '') };
  }

  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#.*)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, '') };
  }

  const shortMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, '') };
  }

  throw new Error('Invalid GitHub repository reference. Use owner/repo format.');
}

async function withRepoLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = repoLocks.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  repoLocks.set(key, prev.then(() => current));
  try {
    return await fn();
  } finally {
    release();
    if (repoLocks.get(key) === current) {
      repoLocks.delete(key);
    }
  }
}

async function findFreePort(preferred?: number): Promise<number> {
  if (preferred) {
    const available = await isPortAvailable(preferred);
    if (available) {
      return preferred;
    }
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address) {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to acquire a free port')));
      }
    });
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.once('close', () => resolve(true)).close())
      .listen(port);
  });
}

async function ensureRepository(owner: string, repo: string): Promise<string> {
  const key = `${owner}/${repo}`;
  const basePath = path.join(WORKSPACE_ROOT, key.replace(/[\\/]/g, '__'));
  const repoPath = path.join(basePath, 'repository');

  console.log(`📁 Ensuring repository directory: ${repoPath}`);
  await ensureDirectory(basePath);

  await withRepoLock(key, async () => {
    if (!existsSync(repoPath)) {
      console.log(`🔄 Cloning repository ${owner}/${repo}...`);
      const token = GITHUB_TOKEN ? encodeURIComponent(GITHUB_TOKEN) : null;
      const cloneUrl = token
        ? `https://${token}@github.com/${owner}/${repo}.git`
        : `https://github.com/${owner}/${repo}.git`;

      const git = simpleGit();
      try {
        await git.clone(cloneUrl, repoPath);
        console.log(`✅ Repository ${owner}/${repo} cloned successfully`);
      } catch (error) {
        // SECURITY: Don't log the full error which might contain the token
        console.error(`❌ Failed to clone repository ${owner}/${repo}:`, error instanceof Error ? error.message.replace(/https:\/\/[^@]+@github\.com/g, 'https://***@github.com') : 'Unknown error');
        throw new Error(`Failed to clone repository ${owner}/${repo}`);
      }
    } else {
      console.log(`✅ Repository ${owner}/${repo} already exists locally`);
    }
  });

  return repoPath;
}

async function updateRepository(owner: string, repo: string, repoPath: string): Promise<void> {
  console.log(`🔄 Updating repository ${owner}/${repo}...`);
  console.log(`   Repo path: ${repoPath}`);
  console.log(`   Repo exists: ${existsSync(repoPath)}`);

  await withRepoLock(`${owner}/${repo}`, async () => {
    const git = simpleGit(repoPath);
    try {
      console.log(`   Running: git fetch --all --tags`);
      await git.fetch(['--all', '--tags']);
      console.log(`✅ Repository ${owner}/${repo} updated successfully`);
    } catch (error) {
      // SECURITY: Sanitize error messages that might contain sensitive paths or tokens
      const sanitizedMessage = error instanceof Error ? error.message.replace(/https:\/\/[^@]+@github\.com/g, 'https://***@github.com') : 'Unknown error';
      console.error(`❌ Failed to update repository ${owner}/${repo}:`, sanitizedMessage);
      throw new Error(`Failed to update repository ${owner}/${repo}`);
    }
  });
}

function appendLog(session: Session, message: string, type: LogType = 'info') {
  const log: SessionLog = {
    timestamp: new Date().toISOString(),
    message,
    type,
  };
  session.logs.push(log);
  for (const listener of session.subscribers) {
    listener(log);
  }
}

function logProcessOutput(session: Session, chunk: Buffer, type: LogType) {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    appendLog(session, line, type);
  }
}

interface RunCommandOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  description?: string;
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function runCommand(
  session: Session,
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => logProcessOutput(session, data, 'log'));
    child.stderr?.on('data', (data: Buffer) => logProcessOutput(session, data, 'error'));

    child.on('error', (error) => {
      appendLog(session, `${options.description ?? `${command} ${args.join(' ')}`} failed: ${error.message}`, 'error');
      reject(error);
    });

    child.on('close', (code) => {
      const exitCode = code ?? 0;
      appendLog(
        session,
        `${options.description ?? `${command} ${args.join(' ')}`} exited with code ${exitCode}`,
        exitCode === 0 ? 'success' : 'error',
      );
      resolve(exitCode);
    });
  });
}

async function ensureDependencies(session: Session): Promise<void> {
  if (session.dependenciesInstalled) {
    return;
  }

  const packageJsonPath = path.join(session.worktreePath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    session.dependenciesInstalled = true;
    return;
  }

  const nodeModulesPath = path.join(session.worktreePath, 'node_modules');
  if (existsSync(nodeModulesPath)) {
    appendLog(session, 'Dependencies already present – skipping install.', 'info');
    session.dependenciesInstalled = true;
    return;
  }

  appendLog(session, 'Installing npm dependencies (npm ci --prefer-offline)...', 'info');

  try {
    const exitCode = await Promise.race([
      runCommand(session, getNpmCommand(), ['ci', '--prefer-offline'], {
        cwd: session.worktreePath,
        description: 'npm ci',
      }),
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error('npm ci timeout - took more than 5 minutes')), 300000)
      ),
    ]);

    if (exitCode !== 0) {
      appendLog(session, 'npm ci failed, falling back to npm install --legacy-peer-deps', 'error');
      const fallbackExitCode = await Promise.race([
        runCommand(session, getNpmCommand(), ['install', '--legacy-peer-deps'], {
          cwd: session.worktreePath,
          description: 'npm install',
        }),
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error('npm install timeout - took more than 5 minutes')), 300000)
        ),
      ]);

      if (fallbackExitCode !== 0) {
        throw new Error('npm install failed');
      }
    }

    appendLog(session, '✅ Dependencies installed.', 'success');
  } catch (error) {
    appendLog(session, `⚠️ Dependency installation failed: ${(error as Error).message}`, 'error');
    throw error;
  }

  session.dependenciesInstalled = true;
}

interface StartCommand {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  description: string;
}

async function determineStartCommand(session: Session, port: number): Promise<StartCommand | null> {
  const packageJsonPath = path.join(session.worktreePath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    console.log(`📂 No package.json found - will serve static files`);
    appendLog(session, 'No package.json found - serving static files only', 'info');
    return null;
  }

  try {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    console.log(`📦 Found package.json for: ${pkg.name || 'unknown'}`);
    appendLog(session, `Found project: ${pkg.name || 'unknown'}`, 'info');

    const scripts = pkg.scripts || {};

    // Try to determine the correct start command
    if (scripts.dev) {
      // Vite, Next.js, or other modern tools
      console.log(`✅ Using 'dev' script`);
      appendLog(session, 'Starting development server (npm run dev)...', 'info');
      return {
        command: getNpmCommand(),
        args: ['run', 'dev'],
        env: { PORT: String(port), VITE_PORT: String(port) },
        description: 'npm run dev',
      };
    } else if (scripts.start) {
      // Create React App or similar
      console.log(`✅ Using 'start' script`);
      appendLog(session, 'Starting development server (npm start)...', 'info');
      return {
        command: getNpmCommand(),
        args: ['start'],
        env: { PORT: String(port), BROWSER: 'none' },
        description: 'npm start',
      };
    } else if (scripts.serve) {
      // Some projects use 'serve'
      console.log(`✅ Using 'serve' script`);
      appendLog(session, 'Starting server (npm run serve)...', 'info');
      return {
        command: getNpmCommand(),
        args: ['run', 'serve'],
        env: { PORT: String(port) },
        description: 'npm run serve',
      };
    }

    // No suitable script found - serve static files
    console.log(`📂 No dev script found - will serve static files`);
    appendLog(session, 'No dev script found - serving static files', 'info');
    return null;
  } catch (error) {
    console.error(`❌ Error reading package.json:`, error);
    appendLog(session, 'Error reading package.json - serving static files', 'error');
    return null;
  }
}

async function buildTree(owner: string, repo: string, sha: string): Promise<FileTreeNode[]> {
  const response = await githubClient.get(`/repos/${owner}/${repo}/git/trees/${sha}`, {
    params: { recursive: 1 },
  });
  const items: Array<{ path: string; mode: string; type: string; sha: string; size?: number }> = response.data.tree;

  const root: FileTreeNode = {
    name: '',
    path: '',
    type: 'directory',
    sha,
    size: null,
    children: [],
  };

  const nodeMap = new Map<string, FileTreeNode>();
  nodeMap.set('', root);

  for (const item of items) {
    const segments = item.path.split('/');
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/');
    const parentNode = nodeMap.get(parentPath ?? '') ?? root;

    if (!parentNode.children) {
      parentNode.children = [];
    }

    if (item.type === 'tree') {
      const node: FileTreeNode = {
        name,
        path: item.path,
        type: 'directory',
        sha: item.sha,
        size: null,
        children: [],
      };
      parentNode.children.push(node);
      nodeMap.set(item.path, node);
    } else if (item.type === 'blob') {
      const node: FileTreeNode = {
        name,
        path: item.path,
        type: 'file',
        sha: item.sha,
        size: item.size ?? null,
      };
      parentNode.children.push(node);
    }
  }

  const sortTree = (nodes?: FileTreeNode[]) => {
    if (!nodes) return;
    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
    for (const node of nodes) {
      if (node.children) {
        sortTree(node.children);
      }
    }
  };

  sortTree(root.children);
  return root.children ?? [];
}

async function fetchFileContent(owner: string, repo: string, sha: string, filePath: string): Promise<string> {
  const response = await githubClient.get(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
    params: { ref: sha },
  });

  if (response.data.type !== 'file' || !response.data.content) {
    throw new Error('Requested path is not a file.');
  }

  const buffer = Buffer.from(response.data.content, response.data.encoding ?? 'base64');
  return buffer.toString('utf-8');
}

async function reserveWorktree(session: Session): Promise<void> {
  console.log(`🔧 Creating worktree for ${session.owner}/${session.repo}@${session.sha.substring(0, 7)}...`);
  console.log(`   Repo path: ${session.repoPath}`);
  console.log(`   Worktree path: ${session.worktreePath}`);

  const git = simpleGit(session.repoPath);
  const worktreeExists = existsSync(session.worktreePath);

  if (worktreeExists) {
    console.log(`🗑️ Removing existing worktree: ${session.worktreePath}`);
    await fs.rm(session.worktreePath, { recursive: true, force: true });
    console.log(`✅ Existing worktree removed`);
  }

  const parentDir = path.dirname(session.worktreePath);
  console.log(`📁 Ensuring parent directory exists: ${parentDir}`);
  await ensureDirectory(parentDir);
  console.log(`✅ Parent directory ready`);

  try {
    console.log(`🔗 Running: git worktree add --force ${session.worktreePath} ${session.sha}`);
    await git.raw(['worktree', 'add', '--force', session.worktreePath, session.sha]);
    console.log(`✅ Worktree created successfully`);

    // Verify worktree was actually created
    const worktreeCreated = existsSync(session.worktreePath);
    console.log(`✓ Worktree exists after creation: ${worktreeCreated}`);

    if (worktreeCreated) {
      const files = await fs.readdir(session.worktreePath);
      console.log(`📂 Files in worktree (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);

      const packageJsonExists = existsSync(path.join(session.worktreePath, 'package.json'));
      console.log(`📦 package.json exists: ${packageJsonExists}`);
    } else {
      console.error(`❌ CRITICAL: Worktree directory doesn't exist after git worktree add!`);
      throw new Error('Worktree directory was not created by git');
    }
  } catch (error) {
    console.error(`❌ Failed to create worktree for ${session.owner}/${session.repo}@${session.sha}:`, error.message);
    console.error(`   Error details:`, (error as any).stack);
    throw error;
  }
}

async function cleanupSession(session: Session): Promise<void> {
  try {
    if (session.process) {
      session.process.kill('SIGTERM');
    }
  } catch (err) {
    // ignore kill errors
  }

  session.process = null;
  session.port = null;

  try {
    const git = simpleGit(session.repoPath);
    await git.raw(['worktree', 'remove', '--force', session.worktreePath]);
  } catch (err) {
    // ignore if already removed
  }

  await fs.rm(session.worktreePath, { recursive: true, force: true }).catch(() => undefined);
}

// AI-based commit analysis helper
interface CommitAnalysis {
  previewViabilityScore: number; // 0-100
  riskFactors: string[];
  positiveFactors: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'risky' | 'not_recommended';
  reasoning: string;
  aiInsights: string;
}

async function analyzeCommitWithAI(
  commitMessage: string,
  commitDiff: string,
  commitAuthor: string,
  fileCount: number,
  hasPackageJson: boolean,
  hasIndexHtml: boolean
): Promise<CommitAnalysis | null> {
  try {
    const analysisPrompt = `Analyze this GitHub commit for web project preview viability. Be concise.

Commit Message: ${commitMessage.substring(0, 200)}
Author: ${commitAuthor}
Files in repo: ${fileCount}
Has package.json: ${hasPackageJson}
Has index.html: ${hasIndexHtml}

Commit Diff (first 1000 chars):
${commitDiff.substring(0, 1000)}

Respond with JSON ONLY (no markdown, no extra text):
{
  "viabilityScore": <0-100 number>,
  "riskFactors": [<list of breaking changes or issues detected>],
  "positiveFactors": [<improvements or stable changes>],
  "recommendation": "<highly_recommended|recommended|risky|not_recommended>",
  "reasoning": "<brief 1-2 sentence explanation>",
  "insights": "<specific technical observation>"
}`;

    console.log(`🤖 Sending analysis to local LLM at ${LOCAL_LLM_URL}/${LOCAL_LLM_MODEL}`);

    // Use local LLM (Ollama compatible API) with 30-second timeout
    const response = await Promise.race([
      localLlmClient.post('/v1/chat/completions', {
        model: LOCAL_LLM_MODEL,
        messages: [{ role: 'user', content: analysisPrompt }],
        stream: false,
        temperature: 0.3,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM analysis timeout - taking too long')), 30000)
      ),
    ]);

    const content = (response as any).data.choices[0].message?.content;
    if (!content) {
      throw new Error('No response from local LLM');
    }

    // Parse JSON response - LLM response might have extra text, so extract JSON
    let parsed;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse LLM response:', content);
      throw new Error('Invalid JSON in LLM response');
    }

    return {
      previewViabilityScore: Math.min(100, Math.max(0, parsed.viabilityScore || 50)),
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      positiveFactors: Array.isArray(parsed.positiveFactors) ? parsed.positiveFactors : [],
      recommendation: parsed.recommendation || 'recommended',
      reasoning: parsed.reasoning || '',
      aiInsights: parsed.insights || '',
    };
  } catch (error) {
    console.error('AI analysis error:', error instanceof Error ? error.message : String(error));
    console.log('⚠️  AI analysis skipped, falling back to heuristic scoring');
    return null;
  }
}

// Fetch commit diff for analysis
async function fetchCommitDiff(owner: string, repo: string, sha: string): Promise<string> {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/commits/${sha}`);
    const commitData = response.data;

    // Extract file changes summary
    const files = commitData.files || [];
    const diffSummary = files
      .slice(0, 10)
      .map((file: any) => `${file.status}: ${file.filename} (${file.changes} changes)`)
      .join('\n');

    return diffSummary || 'No file changes detected';
  } catch (error) {
    console.error('Error fetching commit diff:', error instanceof Error ? error.message : String(error));
    return 'Could not fetch diff details';
  }
}

interface PreviewabilityAnalysis {
  score: number;
  confidence: number;
  previewable: boolean;
  recommendation: 'highly_recommended' | 'recommended' | 'possible' | 'not_recommended';
  detectedFramework: string | null;
  detectedBuildTool: string | null;
  estimatedSetupTime: string;
  strengths: string[];
  issues: string[];
  requirementsChecks: Record<string, boolean>;
}

async function analyzeCommitPreviewability(
  owner: string,
  repo: string,
  sha: string,
  tree: FileTreeNode[],
  fileNames: Set<string>,
  filePaths: Set<string>
): Promise<PreviewabilityAnalysis> {
  const analysis: PreviewabilityAnalysis = {
    score: 0,
    confidence: 0,
    previewable: false,
    recommendation: 'not_recommended',
    detectedFramework: null,
    detectedBuildTool: null,
    estimatedSetupTime: 'unknown',
    strengths: [],
    issues: [],
    requirementsChecks: {},
  };

  let score = 0;
  let confidence = 100;

  // 1. Check for package.json and analyze it (30 points)
  const hasPackageJson = fileNames.has('package.json');
  if (hasPackageJson) {
    try {
      const packageJsonContent = await fetchFileContent(owner, repo, sha, 'package.json');
      const packageJson = JSON.parse(packageJsonContent);

      // Detect framework (15 points)
      const frameworks = {
        'React (Vite)': ['vite', 'react'],
        'React (CRA)': ['react-scripts'],
        'Next.js': ['next'],
        'Vue.js': ['vue', '@vue/cli-service'],
        'Angular': ['@angular/core'],
        'Svelte': ['svelte'],
        'Nuxt.js': ['nuxt'],
        'Gatsby': ['gatsby'],
        'Astro': ['astro'],
      };

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const [framework, keywords] of Object.entries(frameworks)) {
        if (keywords.some(kw => deps[kw])) {
          analysis.detectedFramework = framework;
          score += 15;
          analysis.strengths.push(`✅ Modern framework detected: ${framework}`);
          break;
        }
      }

      // Check for dev script (15 points)
      const scripts = packageJson.scripts || {};
      if (scripts.dev || scripts.start || scripts.serve) {
        score += 15;
        analysis.strengths.push('✅ Has development server script');
        analysis.requirementsChecks['hasDevScript'] = true;

        if (scripts.dev) analysis.detectedBuildTool = 'Vite/Modern';
        else if (scripts.start) analysis.detectedBuildTool = 'CRA/Webpack';
        else if (scripts.serve) analysis.detectedBuildTool = 'Vue CLI/Other';
      } else {
        analysis.issues.push('⚠️ No dev/start script found in package.json');
        analysis.requirementsChecks['hasDevScript'] = false;
        confidence -= 20;
      }

      // Check dependency complexity (affect confidence)
      const depCount = Object.keys(deps).length;
      if (depCount > 0 && depCount < 50) {
        analysis.strengths.push(`✅ Reasonable dependency count (${depCount})`);
      } else if (depCount >= 50 && depCount < 100) {
        analysis.issues.push(`⚠️ Many dependencies (${depCount}) - longer install time`);
        confidence -= 10;
      } else if (depCount >= 100) {
        analysis.issues.push(`⚠️ Very large project (${depCount} deps) - may take 5+ minutes`);
        confidence -= 20;
      }

      // Estimate setup time
      if (depCount < 30) analysis.estimatedSetupTime = '1-2 minutes';
      else if (depCount < 70) analysis.estimatedSetupTime = '2-4 minutes';
      else analysis.estimatedSetupTime = '5+ minutes';

    } catch (error) {
      console.error('Error analyzing package.json:', error);
      analysis.issues.push('⚠️ Could not parse package.json');
      confidence -= 15;
    }
  } else {
    analysis.issues.push('❌ No package.json found - likely not a Node.js project');
    confidence -= 30;
  }

  // 2. Check for HTML entry points (20 points)
  const htmlFiles = Array.from(filePaths).filter(p => p.endsWith('.html') || p.endsWith('.htm'));
  if (htmlFiles.length > 0) {
    score += 20;
    analysis.strengths.push(`✅ Has HTML entry point(s) (${htmlFiles.length})`);
    analysis.requirementsChecks['hasHtmlEntry'] = true;
  } else if (hasPackageJson) {
    // For SPA frameworks, HTML might be generated
    score += 10;
    analysis.strengths.push('✅ Framework likely generates HTML');
    analysis.requirementsChecks['hasHtmlEntry'] = true;
  } else {
    analysis.requirementsChecks['hasHtmlEntry'] = false;
  }

  // 3. Project structure (20 points)
  const hasProperStructure =
    Array.from(filePaths).some(p => p.startsWith('src/')) ||
    Array.from(filePaths).some(p => p.startsWith('app/')) ||
    Array.from(filePaths).some(p => p.startsWith('pages/'));

  if (hasProperStructure) {
    score += 20;
    analysis.strengths.push('✅ Well-organized project structure');
    analysis.requirementsChecks['hasSourceDirectory'] = true;
  } else {
    score += 5;
    analysis.requirementsChecks['hasSourceDirectory'] = false;
  }

  // 4. Check for config files (10 points)
  const configFiles = [
    'vite.config.js', 'vite.config.ts',
    'next.config.js', 'next.config.mjs',
    'vue.config.js',
    'webpack.config.js',
    'tsconfig.json',
  ];

  const hasConfig = configFiles.some(f => fileNames.has(f));
  if (hasConfig) {
    score += 10;
    analysis.strengths.push('✅ Has build configuration');
  }

  // 5. Check for source code files (15 points)
  const sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
  const sourceFileCount = Array.from(filePaths).filter(p =>
    sourceExtensions.some(ext => p.endsWith(ext))
  ).length;

  if (sourceFileCount > 5) {
    score += 15;
    analysis.strengths.push(`✅ Has source files (${sourceFileCount})`);
  } else if (sourceFileCount > 0) {
    score += 5;
    analysis.issues.push('⚠️ Few source files - might be minimal project');
  }

  // 6. Check for potential blockers (negative points)
  const blockers = {
    'docker-compose.yml': 'Requires Docker setup',
    'Dockerfile': 'Containerized app',
    '.env.example': 'Requires environment configuration',
  };

  for (const [file, reason] of Object.entries(blockers)) {
    if (fileNames.has(file)) {
      analysis.issues.push(`⚠️ ${reason} (${file} found)`);
      confidence -= 5;
    }
  }

  // Check for backend-only indicators
  const backendOnly =
    fileNames.has('server.js') && !hasPackageJson ||
    fileNames.has('app.py') ||
    fileNames.has('main.go') ||
    fileNames.has('Cargo.toml');

  if (backendOnly) {
    score -= 20;
    analysis.issues.push('❌ Appears to be backend-only project');
    confidence -= 30;
  }

  // 7. File count check (5 points)
  if (fileNames.size > 10 && fileNames.size < 500) {
    score += 5;
  } else if (fileNames.size >= 500) {
    analysis.issues.push('⚠️ Very large project - may be slow to clone');
    confidence -= 5;
  } else if (fileNames.size < 5) {
    analysis.issues.push('⚠️ Very small project - might be incomplete');
    confidence -= 10;
  }

  // Calculate final score (capped at 100)
  analysis.score = Math.max(0, Math.min(100, score));
  analysis.confidence = Math.max(0, Math.min(100, confidence));

  // Determine previewability
  analysis.previewable = analysis.score >= 50;

  // Determine recommendation
  if (analysis.score >= 85 && confidence >= 80) {
    analysis.recommendation = 'highly_recommended';
  } else if (analysis.score >= 70 && confidence >= 60) {
    analysis.recommendation = 'recommended';
  } else if (analysis.score >= 50) {
    analysis.recommendation = 'possible';
  } else {
    analysis.recommendation = 'not_recommended';
  }

  return analysis;
}

// Server configuration endpoint - must be defined early
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    port: PORT,
    publicUrl: PUBLIC_SERVER_URL,
    timestamp: new Date().toISOString(),
  });
});

// Get all repositories for a GitHub user
app.get('/api/user/:username/repos', async (req: Request, res: Response) => {
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    console.log(`📚 Fetching repositories for user: ${username}`);

    // Fetch all repos (paginated, up to 100 per page)
    const repos: any[] = [];
    let page = 1;
    let hasMore = true;

    // Use /users/{username}/repos for any user (public repos only without auth)
    // This works for any GitHub user and doesn't require authentication for public repos
    const endpoint = `/users/${username}/repos`;

    while (hasMore && page <= 30) { // Limit to 30 pages (3000 repos max)
      try {
        const response = await githubClient.get(endpoint, {
          params: {
            per_page: 100,
            page,
            sort: 'updated', // Most recently updated first
            type: 'all', // Include all repos (owner, member, etc.)
          },
        });

        if (response.data.length === 0) {
          hasMore = false;
        } else {
          repos.push(...response.data);
          page++;

          // If we got less than 100, we're on the last page
          if (response.data.length < 100) {
            hasMore = false;
          }
        }
      } catch (pageError) {
        console.error(`⚠️  Error fetching page ${page}:`, pageError);
        if (axios.isAxiosError(pageError) && pageError.response?.status === 404) {
          // User not found, stop fetching
          hasMore = false;
        } else {
          // Other error, return what we have so far
          break;
        }
      }
    }

    console.log(`✅ Found ${repos.length} total repositories`);

    // Return simplified repo data
    const simplifiedRepos = repos.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      updatedAt: repo.updated_at,
      isPrivate: repo.private,
    }));

    res.json({ username, count: simplifiedRepos.length, repos: simplifiedRepos });
  } catch (error) {
    console.error(`❌ Error fetching repos for ${username}:`, error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Check if a commit is previewable
app.post('/api/commit-preview-check', async (req: Request, res: Response) => {
  const { repoUrl, sha } = req.body as { repoUrl?: string; sha?: string };

  console.log('🔍 DEBUG /api/commit-preview-check received:', { repoUrl, sha, shaLength: sha?.length });

  if (!repoUrl || !validateRepoUrl(repoUrl)) {
    console.error('❌ repoUrl validation failed:', { repoUrl, isValid: validateRepoUrl(repoUrl || '') });
    return res.status(400).json({ error: 'Valid repoUrl is required' });
  }

  if (!sha || !validateCommitSha(sha)) {
    console.error('❌ sha validation failed:', { sha, shaLength: sha?.length, isValid: validateCommitSha(sha || '') });
    return res.status(400).json({ error: 'Valid commit SHA is required' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    console.log('✅ Parsed repo:', { owner, repo });

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo);
    if (!hasAccess) {
      return res.status(403).json({ previewable: false, reason: 'Repository not accessible' });
    }

    // Fetch commit details for AI analysis
    const commitResponse = await githubClient.get(`/repos/${owner}/${repo}/commits/${sha}`);
    const commitData = commitResponse.data;
    const commitMessage = commitData.commit?.message ?? 'No message';
    const commitAuthor = commitData.commit?.author?.name ?? 'Unknown';

    // Fetch the tree to check for previewable content
    const tree = await buildTree(owner, repo, sha);

    // Check for key files that indicate a previewable project
    const fileNames = new Set<string>();
    const filePaths = new Set<string>();

    const traverse = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          fileNames.add(node.name.toLowerCase());
          filePaths.add(node.path.toLowerCase());
        } else if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(tree);

    // Check for previewable indicators
    const hasPackageJson = fileNames.has('package.json');
    const hasIndexHtml = fileNames.has('index.html') || Array.from(filePaths).some(p => p.endsWith('index.html'));
    const hasBuildFiles = Array.from(filePaths).some(p =>
      p.includes('/dist/') ||
      p.includes('/build/') ||
      p.includes('/out/') ||
      p.includes('/.next/') ||
      p.includes('/public/')
    );

    // Check for source files or common web file types
    const hasSourceFiles = Array.from(filePaths).some(p =>
      p.includes('/src/') ||
      p.includes('/lib/') ||
      p.includes('/pages/') ||
      p.includes('/components/') ||
      p.endsWith('.jsx') ||
      p.endsWith('.tsx') ||
      p.endsWith('.vue') ||
      p.endsWith('.svelte')
    );

    // Check for HTML, CSS, or JS files
    const hasWebFiles = Array.from(filePaths).some(p =>
      p.endsWith('.html') ||
      p.endsWith('.htm') ||
      p.endsWith('.css') ||
      p.endsWith('.scss') ||
      p.endsWith('.sass') ||
      p.endsWith('.less')
    );

    // Basic heuristic previewability
    const basicIsPreviewable =
      hasPackageJson ||
      hasIndexHtml ||
      hasBuildFiles ||
      hasSourceFiles ||
      hasWebFiles ||
      fileNames.size > 5;

    // Advanced predictive analysis
    const analysis = await analyzeCommitPreviewability(owner, repo, sha, tree, fileNames, filePaths);

    console.log(`✅ Preview check complete (advanced): ${repoUrl}@${sha.substring(0, 7)} = ${analysis.score}/100`);
    console.log(`   Confidence: ${analysis.confidence}% | Framework: ${analysis.detectedFramework || 'none'}`);
    console.log(`   Issues: ${analysis.issues.length} | Strengths: ${analysis.strengths.length}`);

    res.json({
      previewable: analysis.previewable,
      previewViabilityScore: analysis.score,
      confidence: analysis.confidence,
      recommendation: analysis.recommendation,
      detectedFramework: analysis.detectedFramework,
      detectedBuildTool: analysis.detectedBuildTool,
      estimatedSetupTime: analysis.estimatedSetupTime,
      basicIndicators: {
        hasPackageJson,
        hasIndexHtml,
        hasBuildFiles,
        hasSourceFiles,
        hasWebFiles,
        fileCount: fileNames.size,
      },
      analysis: {
        strengths: analysis.strengths,
        issues: analysis.issues,
        requirementsChecks: analysis.requirementsChecks,
      },
      commitInfo: {
        message: commitMessage.split('\n')[0],
        author: commitAuthor,
        filesChanged: commitData.files?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error checking commit preview status:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      return res.status(status).json({ previewable: false, reason: 'Error accessing repository' });
    }
    res.status(500).json({ previewable: false, reason: 'Internal server error' });
  }
});

app.post('/api/commits', async (req: Request, res: Response) => {
  const { repoUrl, perPage = 20 } = req.body as { repoUrl?: string; perPage?: number };

  if (!repoUrl || !validateRepoUrl(repoUrl)) {
    return res.status(400).json({ error: 'Valid repoUrl is required' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Repository not accessible. Check if it exists and your token has the required permissions.'
      });
    }

    const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
      params: {
        per_page: Math.min(Math.max(perPage, 1), 100), // Ensure valid range
      },
    });

    const commits = (response.data as any[]).map((commit) => ({
      sha: commit.sha,
      message: commit.commit?.message ?? 'No commit message',
      author: {
        name: commit.commit?.author?.name ?? commit.author?.login ?? 'Unknown',
        date: commit.commit?.author?.date ?? new Date().toISOString(),
      },
    }));

    res.json({ commits });
  } catch (error) {
    console.error('Error fetching commits:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      let message = 'Failed to fetch commits';

      if (status === 404) {
        message = 'Repository not found';
      } else if (status === 403) {
        message = 'Access denied. Check your GitHub token permissions.';
      } else if (status === 401) {
        message = 'Invalid GitHub token';
      }

      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tree', async (req: Request, res: Response) => {
  const { repoUrl, sha } = req.body as { repoUrl?: string; sha?: string };

  if (!repoUrl || !validateRepoUrl(repoUrl)) {
    return res.status(400).json({ error: 'Valid repoUrl is required' });
  }

  if (!sha || !validateCommitSha(sha)) {
    return res.status(400).json({ error: 'Valid commit SHA is required' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Repository not accessible. Check if it exists and your token has the required permissions.'
      });
    }

    const tree = await buildTree(owner, repo, sha);
    res.json({ tree });
  } catch (error) {
    console.error('Error fetching tree:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      let message = 'Failed to fetch tree';

      if (status === 404) {
        message = 'Repository or commit not found';
      } else if (status === 403) {
        message = 'Access denied. Check your GitHub token permissions.';
      }

      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/file', async (req: Request, res: Response) => {
  const { repoUrl, sha, path: filePath } = req.body as { repoUrl?: string; sha?: string; path?: string };

  if (!repoUrl || !validateRepoUrl(repoUrl)) {
    return res.status(400).json({ error: 'Valid repoUrl is required' });
  }

  if (!sha || !validateCommitSha(sha)) {
    return res.status(400).json({ error: 'Valid commit SHA is required' });
  }

  if (!filePath || !validateFilePath(filePath)) {
    return res.status(400).json({ error: 'Valid file path is required' });
  }

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    // Check repository access
    const hasAccess = await checkRepositoryAccess(owner, repo);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Repository not accessible. Check if it exists and your token has the required permissions.'
      });
    }

    const content = await fetchFileContent(owner, repo, sha, filePath);

    // Check file size for security
    if (content.length > MAX_FILE_SIZE) {
      return res.status(413).json({
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024)}KB`
      });
    }

    res.json({ content });
  } catch (error) {
    console.error('Error fetching file:', error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      let message = 'Failed to fetch file content';

      if (status === 404) {
        message = 'File not found';
      } else if (status === 403) {
        message = 'Access denied. Check your GitHub token permissions.';
      }

      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Combined endpoint that downloads commit and starts preview in one action
app.post('/api/workspace/start-preview', async (req: Request, res: Response) => {
  const { repoUrl, sha } = req.body as { repoUrl?: string; sha?: string };
  if (!repoUrl || !sha) {
    return res.status(400).json({ error: 'repoUrl and sha are required' });
  }

  console.log(`🚀 Starting preview for: ${repoUrl}@${sha.substring(0, 7)}`);

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);
    console.log(`📋 Parsed repository: ${owner}/${repo}`);

    // Check repository access first
    const hasAccess = await checkRepositoryAccess(owner, repo);
    if (!hasAccess) {
      console.log(`❌ Repository access denied: ${owner}/${repo}`);
      return res.status(403).json({
        error: 'Repository not accessible. Check if it exists and your token has the required permissions.'
      });
    }

    const repoPath = await ensureRepository(owner, repo);

    const sessionId = uuidv4();
    const worktreePath = path.join(path.dirname(repoPath), 'sessions', sessionId);

    // Allocate port early to avoid conflicts
    const allocatedPort = await findFreePort();

    const session: Session = {
      id: sessionId,
      repoUrl,
      owner,
      repo,
      sha,
      repoPath,
      worktreePath,
      status: 'preparing',
      previewUrl: null,
      logs: [],
      subscribers: new Set(),
      process: null,
      port: allocatedPort,
      dependenciesInstalled: false,
    };
    sessions.set(sessionId, session);

    appendLog(session, `Starting preview for ${owner}/${repo}@${sha.substring(0, 7)} ...`, 'info');
    appendLog(session, `Allocated port ${allocatedPort} for preview server`, 'info');
    appendLog(session, 'Downloading repository from GitHub...', 'info');

    try {
      // Step 1: Download and prepare the commit
      await updateRepository(owner, repo, repoPath);
      appendLog(session, 'Repository synchronized.', 'success');
      await reserveWorktree(session);
      appendLog(session, 'Commit downloaded to temporary workspace.', 'success');

      // Step 2: Set up preview URL and return immediately
      const previewUrl = `${PUBLIC_SERVER_URL}/preview/${sessionId}/`;
      session.previewUrl = previewUrl;

      // Return early to avoid timeout, launch will happen asynchronously
      res.json({ sessionId, previewUrl });

      // Step 3: Launch the preview asynchronously (don't await to avoid blocking)
      setImmediate(async () => {
        try {
          appendLog(session, 'Starting preview server...', 'info');
          console.log(`\n📺 PREVIEW STARTUP FOR SESSION ${sessionId}:`);
          console.log(`   Worktree path: ${session.worktreePath}`);

          const startCommand = await determineStartCommand(session, allocatedPort);
          console.log(`   Start command determined: ${startCommand ? startCommand.description : 'none'}`);

          if (!startCommand) {
            session.status = 'running';
            appendLog(session, 'No start script detected. Serving static files.', 'info');
            appendLog(session, `Preview available at ${previewUrl}`, 'success');
            console.log(`   Status: RUNNING (static files)`);
            return;
          }

          // Install dependencies before starting dev server
          console.log(`📦 Installing dependencies...`);
          await ensureDependencies(session);
          console.log(`✅ Dependencies installed successfully`);

          appendLog(session, `Using port ${allocatedPort} for preview process.`, 'info');
          appendLog(session, `Running ${startCommand.description}...`, 'info');
          console.log(`   Spawning: ${startCommand.command} ${startCommand.args.join(' ')}`);
          console.log(`   CWD: ${session.worktreePath}`);

          const child = spawn(startCommand.command, startCommand.args, {
            cwd: session.worktreePath,
            env: { ...process.env, ...startCommand.env },
            shell: process.platform === 'win32',
            stdio: ['ignore', 'pipe', 'pipe'],
          });

          session.process = child;
          console.log(`   Process spawned with PID: ${child.pid}`);

          child.stdout.on('data', (data: Buffer) => logProcessOutput(session, data, 'log'));
          child.stderr.on('data', (data: Buffer) => logProcessOutput(session, data, 'error'));

          child.on('error', (error) => {
            appendLog(session, `Preview process error: ${error.message}`, 'error');
            console.error(`   Process ERROR: ${error.message}`);
            session.status = 'error';
            session.process = null;
          });

          child.on('close', (code) => {
            const exitCode = code ?? 0;
            const type: LogType = exitCode === 0 ? 'info' : 'error';
            appendLog(session, `Preview process exited with code ${exitCode}`, type);
            console.log(`   Process CLOSED with code ${exitCode}`);
            session.process = null;
            session.status = exitCode === 0 ? 'stopped' : 'error';
          });

          // Wait for dev server to be ready using multi-pattern probability detection
          const waitForDevServer = async () => {
            const maxWaitTime = 180000; // 180 seconds max wait
            const startTime = Date.now();
            let devServerReady = false;

            appendLog(session, `Waiting for dev server to start...`, 'info');
            console.log(`   Waiting for dev server startup (multi-pattern detection)...`);

            // Define 5 different startup indicators with confidence weights
            interface StartupIndicator {
              name: string;
              weight: number; // Confidence weight (0-100)
              check: (logs: string[]) => boolean;
            }

            const indicators: StartupIndicator[] = [
              {
                name: 'Compilation Success',
                weight: 30,
                check: (logs) => logs.some(msg => 
                  msg.includes('webpack compiled') ||
                  msg.includes('compiled successfully') ||
                  msg.includes('compiled with warnings') ||
                  msg.includes('build finished')
                )
              },
              {
                name: 'Server Ready Message',
                weight: 25,
                check: (logs) => logs.some(msg =>
                  msg.includes('ready - started server on') ||
                  msg.includes('server running') ||
                  msg.includes('app is running at') ||
                  msg.includes('service running') ||
                  msg.includes('web service running') ||
                  (msg.includes('vite') && msg.includes('ready')) ||
                  msg.includes('development server is running') ||
                  msg.includes('integration ready')
                )
              },
              {
                name: 'URL/Port Declaration',
                weight: 25,
                check: (logs) => logs.some(msg =>
                  msg.includes('localhost:') ||
                  msg.includes('127.0.0.1:') ||
                  msg.includes('on http://') ||
                  (msg.includes('➜') && msg.includes('local:')) ||
                  msg.match(/https?:\/\/(localhost|127\.0\.0\.1):\d+/) !== null
                )
              },
              {
                name: 'Network Interface Binding',
                weight: 15,
                check: (logs) => logs.some(msg =>
                  msg.includes('listening on') ||
                  msg.includes('started on port') ||
                  msg.includes('running on port') ||
                  msg.includes('server listening') ||
                  msg.includes('accepting connections') ||
                  msg.includes('bound to port')
                )
              },
              {
                name: 'Framework-Specific Ready',
                weight: 5,
                check: (logs) => logs.some(msg =>
                  (msg.includes('local:') && msg.includes('http')) ||
                  msg.includes('hot update') ||
                  msg.includes('hmr') ||
                  msg.includes('fast refresh')
                )
              }
            ];

            const CONFIDENCE_THRESHOLD = 40; // Need at least 40% confidence to proceed

            while (Date.now() - startTime < maxWaitTime) {
              if (!session.process || session.process.killed) {
                appendLog(session, `Process stopped before startup completed`, 'error');
                console.log(`   Process stopped prematurely`);
                return;
              }

              // Get recent logs as lowercase strings
              const recentLogs = session.logs.slice(-50).map(log => log.message.toLowerCase());

              // Check all indicators and calculate total confidence
              const matchedIndicators: string[] = [];
              let totalConfidence = 0;

              for (const indicator of indicators) {
                if (indicator.check(recentLogs)) {
                  matchedIndicators.push(indicator.name);
                  totalConfidence += indicator.weight;
                }
              }

              // Log progress every 5 seconds
              const elapsed = Date.now() - startTime;
              if (elapsed % 5000 < 1000 && totalConfidence > 0) {
                console.log(`   📊 Confidence: ${totalConfidence}% | Matched: [${matchedIndicators.join(', ')}]`);
              }

              // Check if we've met the confidence threshold
              if (totalConfidence >= CONFIDENCE_THRESHOLD) {
                devServerReady = true;
                const matchedList = matchedIndicators.join(', ');
                console.log(`   ✅ Dev server startup detected (${totalConfidence}% confidence)`);
                console.log(`   📋 Indicators matched: ${matchedList}`);
                appendLog(session, `Dev server ready! (${totalConfidence}% confidence)`, 'info');
                appendLog(session, `Matched patterns: ${matchedList}`, 'info');
                break;
              }

              await new Promise(resolve => setTimeout(resolve, 1000)); // Check every 1 second
            }

            if (!devServerReady) {
              const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
              appendLog(session, `⚠️ Dev server didn't start after ${elapsedSeconds} seconds`, 'error');
              console.log(`   ⚠️ Timeout waiting for dev server startup after ${elapsedSeconds}s`);
              
              // Log what we DID detect for debugging
              const recentLogs = session.logs.slice(-10).map(log => log.message);
              console.log(`   📝 Last 10 log messages:`);
              recentLogs.forEach(msg => console.log(`      ${msg}`));
              
              return;
            }

            // Now verify the server is responding with retries
            appendLog(session, `Verifying dev server is responding on port ${allocatedPort}...`, 'info');
            console.log(`   Polling port ${allocatedPort} for HTTP response...`);

            const maxPollAttempts = 30; // 30 attempts = 60 seconds
            for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
              if (!session.process || session.process.killed) break;

              try {
                const testUrl = `http://127.0.0.1:${allocatedPort}/`;
                const response = await fetch(testUrl, {
                  method: 'GET',
                  signal: AbortSignal.timeout(3000)
                });

                if (response.status === 200 || response.status === 304) {
                  session.status = 'running';
                  appendLog(session, `✅ Dev server is ready and responding!`, 'success');
                  appendLog(session, `Preview available at ${previewUrl}`, 'success');
                  console.log(`   ✅ Dev server ready and responding`);
                  return;
                }
              } catch (error) {
                // Server not ready yet, continue waiting
                if (attempt % 5 === 0) {
                  console.log(`   Still waiting... (attempt ${attempt + 1}/${maxPollAttempts})`);
                }
              }

              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            appendLog(session, `⚠️ Dev server started but not responding to HTTP requests after 60 seconds`, 'error');
            console.log(`   ⚠️ Dev server not responding after waiting`);
          };

          // Start polling asynchronously
          waitForDevServer().catch(err => {
            console.error(`   Error waiting for dev server:`, err);
            appendLog(session, `Error during dev server verification: ${err.message}`, 'error');
          });

        } catch (launchError) {
          session.status = 'error';
          const errorMsg = (launchError as Error).message;
          appendLog(session, `Failed to launch preview: ${errorMsg}`, 'error');
          console.error(`   LAUNCH ERROR: ${errorMsg}`);
          console.error(`   Stack:`, (launchError as Error).stack);
        }
      });

    } catch (err) {
      session.status = 'error';
      const errorMessage = `Failed to start preview: ${(err as Error).message}`;
      appendLog(session, errorMessage, 'error');
      console.error(`❌ SESSION PREPARATION ERROR: ${errorMessage}`);
      console.error(`   Stack:`, (err as Error).stack);
      sessions.delete(sessionId);
      await fs.rm(worktreePath, { recursive: true, force: true }).catch(() => { });
      res.status(500).json({ error: errorMessage });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const message = error.response?.data?.message ?? 'Failed to start preview';
      return res.status(status).json({ error: message });
    }
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/workspace/run', async (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // SECURITY: Validate session ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Workspace session not found' });
  }

  if (session.status === 'running' && session.previewUrl) {
    return res.json({ previewUrl: session.previewUrl });
  }

  try {
    if (session.process) {
      try {
        session.process.kill('SIGTERM');
      } catch (error) {
        appendLog(session, `Failed to stop previous preview process: ${(error as Error).message}`, 'error');
      }
      session.process = null;
      // Keep the allocated port for potential restart
    }

    session.status = 'preparing';
    appendLog(session, 'Starting local preview server...', 'info');

    // Use the port that was allocated during preparation
    const port = session.port;
    if (!port) {
      throw new Error('No port was allocated during workspace preparation');
    }

    const startCommand = await determineStartCommand(session, port);
    const previewUrl = `${PUBLIC_SERVER_URL}/preview/${sessionId}/`;
    session.previewUrl = previewUrl;

    if (!startCommand) {
      session.status = 'running';
      appendLog(session, 'No start script detected. Serving static snapshot.', 'info');
      appendLog(session, `Preview available at ${previewUrl}`, 'success');
      res.json({ previewUrl });
      return;
    }

    appendLog(session, `Using pre-allocated port ${port} for preview process.`, 'info');
    appendLog(session, `Running ${startCommand.description}...`, 'info');

    const child = spawn(startCommand.command, startCommand.args, {
      cwd: session.worktreePath,
      env: { ...process.env, ...startCommand.env },
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    session.process = child;

    child.stdout.on('data', (data: Buffer) => logProcessOutput(session, data, 'log'));
    child.stderr.on('data', (data: Buffer) => logProcessOutput(session, data, 'error'));

    child.on('error', (error) => {
      appendLog(session, `Preview process error: ${error.message}`, 'error');
      session.status = 'error';
      session.process = null;
      // Keep the allocated port for potential restart
    });

    child.on('close', (code) => {
      const exitCode = code ?? 0;
      const type: LogType = exitCode === 0 ? 'info' : 'error';
      appendLog(session, `Preview process exited with code ${exitCode}`, type);
      session.process = null;
      // Keep the allocated port for potential restart
      session.status = exitCode === 0 ? 'stopped' : 'error';
    });

    // Give the process a moment to start up before marking as running
    setTimeout(() => {
      if (session.process && !session.process.killed) {
        session.status = 'running';
        appendLog(session, `Preview available at ${previewUrl}`, 'success');
      } else if (session.process?.killed === false) {
        appendLog(session, `Process started successfully on port ${session.port}`, 'success');
        session.status = 'running';
      } else {
        appendLog(session, `Process failed to start or already exited`, 'error');
      }
    }, 10000);

    res.json({ previewUrl });
  } catch (error) {
    session.status = 'error';
    // Keep the allocated port for potential restart
    if (session.process) {
      try {
        session.process.kill('SIGTERM');
      } catch {
        // ignore
      }
      session.process = null;
    }
    appendLog(session, `Failed to start preview: ${(error as Error).message}`, 'error');
    res.status(500).json({ error: 'Failed to start preview' });
  }
});

app.post('/api/workspace/stop', async (req: Request, res: Response) => {
  // SECURITY: Validate session ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }

  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Workspace session not found' });
  }

  appendLog(session, 'Stopping preview and cleaning up workspace...', 'info');
  await cleanupSession(session);
  session.status = 'stopped';
  sessions.delete(sessionId);
  appendLog(session, 'Workspace stopped.', 'success');
  res.json({ ok: true });
});

// Launch mini window for preview
app.post('/api/workspace/launch-mini', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }

  try {
    // Launch PowerShell script to open mini window
    const scriptPath = path.join(process.cwd(), 'miniwin.ps1');
    
    // Check if script exists
    if (!existsSync(scriptPath)) {
      console.log(`⚠️ miniwin.ps1 not found at ${scriptPath}`);
      return res.status(404).json({ error: 'miniwin.ps1 script not found' });
    }

    console.log(`🚀 Launching mini window for: ${url}`);
    
    // Launch PowerShell in background
    spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', scriptPath,
      url
    ], {
      detached: true,
      stdio: 'ignore'
    }).unref();

    res.json({ ok: true, message: 'Mini window launched' });
  } catch (error) {
    console.error(`❌ Failed to launch mini window:`, error);
    res.status(500).json({ error: 'Failed to launch mini window' });
  }
});

app.get('/api/workspace/:sessionId/logs', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  // SECURITY: Validate session ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  // Ensure headers are flushed immediately
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const send = (log: SessionLog) => {
    try {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    } catch (error) {
      console.error(`Failed to send log to client: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  session.subscribers.add(send);
  console.log(`📡 New EventSource subscriber for session ${sessionId}. Session has ${session.logs.length} existing logs.`);

  // Send all existing logs to the new subscriber
  for (const log of session.logs) {
    send(log);
  }

  // Send a keep-alive ping every 15 seconds to keep connection alive
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(':keep-alive\n\n');
    } catch (error) {
      clearInterval(keepAliveInterval);
      session.subscribers.delete(send);
    }
  }, 15000);

  req.on('close', () => {
    console.log(`📡 EventSource subscriber closed for session ${sessionId}`);
    clearInterval(keepAliveInterval);
    session.subscribers.delete(send);
  });

  req.on('error', () => {
    console.error(`❌ EventSource error for session ${sessionId}`);
    clearInterval(keepAliveInterval);
    session.subscribers.delete(send);
  });
});

app.get('/favicon.ico', (req: Request, res: Response) => {
  applyRelaxedPreviewHeaders(res);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).type('image/png').send(Buffer.from(DEFAULT_FAVICON_BASE64, 'base64'));
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/preview')) {
      return next();
    }

    const referer = req.get('referer') ?? req.get('referrer') ?? '';
    const match = referer.match(/\/preview\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/(?:index\.html)?|$)/i);

    if (!match) {
      return next();
    }

    const sessionId = match[1];
    const session = sessions.get(sessionId);

    if (!session) {
      applyRelaxedPreviewHeaders(res);
      res.status(404).send('Preview session not found');
      return;
    }

    if (session.status !== 'running') {
      applyRelaxedPreviewHeaders(res);
      res.status(503).send('Preview session not ready');
      return;
    }

    const safeRelative = sanitizeRelativePath(req.path);
    const handled = await proxySessionAsset(req, res, session, safeRelative);

    if (!handled) {
  
  // SECURITY: Validate session ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    res.status(400).send('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>Invalid session ID format.</body></html>');
    return;
  }
  
      applyRelaxedPreviewHeaders(res);
      res.status(404).send('File not found');
    }
  } catch (error) {
    next(error);
  }
});

app.get('/preview/:sessionId/*', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  console.log(`📺 Preview request: ${req.originalUrl} for session ${sessionId}`);
  console.log(`   Session exists: ${!!session}`);
  console.log(`   Session status: ${session?.status}`);
  console.log(`   Session port: ${session?.port}`);
  console.log(`   Session process alive: ${!!session?.process && !session?.process.killed}`);

  if (!session) {
    console.log(`❌ Preview not available - session status: not found`);
    applyRelaxedPreviewHeaders(res);
    res
      .status(404)
      .send('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>Preview session not found.</body></html>');
    return;
  }

  if (session.status !== 'running') {
    console.log(`⏳ Preview not ready yet - current status: ${session.status}`);
    applyRelaxedPreviewHeaders(res);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    // Provide more detailed status message
    let statusMessage = 'Preview is preparing. Please wait...';
    if (session.status === 'error') {
      statusMessage = 'Preview encountered an error. Please check the logs.';
    } else if (session.status === 'stopped') {
      statusMessage = 'Preview has been stopped.';
    }

    res
      .status(503)
      .send(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h1>${statusMessage}</h1><p>Session: ${sessionId}</p><p><a href="/api/workspace/${sessionId}/logs">View Logs</a></p></body></html>`);
    return;
  }

  const relativePath = req.params[0] || '';
  const safeRelative = sanitizeRelativePath(relativePath);

  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.substring(queryIndex) : '';

  console.log(`\n📺 Preview request for session ${sessionId}:`);
  console.log(`   Original URL: ${req.originalUrl}`);
  console.log(`   Relative path: ${safeRelative || 'index.html (root)'}`);
  console.log(`   Session worktree: ${session.worktreePath}`);
  console.log(`   Session has port: ${session.port ? 'yes' : 'no'}`);
  console.log(`   Session has process: ${session.process ? 'yes' : 'no'}`);

  // Try proxying first (for dev servers) - should skip since we don't start processes anymore
  const proxied = await proxySessionAsset(req, res, session, safeRelative);

  if (proxied) {
    console.log(`   ✅ Served via proxy`);
    return;
  }

  // If no dev server, serve static files - try multiple locations
  const possiblePaths = [
    path.resolve(session.worktreePath, safeRelative),
    path.resolve(session.worktreePath, 'public', safeRelative),
    path.resolve(session.worktreePath, 'dist', safeRelative),
    path.resolve(session.worktreePath, 'build', safeRelative),
    path.resolve(session.worktreePath, 'out', safeRelative),
  ];

  console.log(`   🔍 Looking for static file: ${safeRelative || 'index.html'}`);

  let targetPath: string | null = null;

  for (const possiblePath of possiblePaths) {
    if (!possiblePath.startsWith(session.worktreePath)) {
      continue; // Security check
    }

    try {
      const stat = await fs.stat(possiblePath);

      if (stat.isDirectory()) {
        // Try index.html in this directory
        const indexPath = path.join(possiblePath, 'index.html');
        if (existsSync(indexPath)) {
          targetPath = indexPath;
          console.log(`   ✅ Found index.html at: ${path.relative(session.worktreePath, indexPath)}`);
          break;
        }
      } else if (stat.isFile()) {
        targetPath = possiblePath;
        console.log(`   ✅ Found file at: ${path.relative(session.worktreePath, possiblePath)}`);
        break;
      }
    } catch (err) {
      // File doesn't exist at this location, try next
      continue;
    }
  }

  if (!targetPath) {
    console.log(`   ❌ File not found in any location`);
    console.log(`   Searched paths:`);
    possiblePaths.forEach(p => console.log(`      - ${p}`));

    // List what files ARE in the worktree
    try {
      const files = await fs.readdir(session.worktreePath);
      console.log(`   📂 Files in worktree root: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
    } catch (err) {
      console.log(`   ❌ Could not read worktree directory`);
    }

    applyRelaxedPreviewHeaders(res);
    res.status(404).send(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <h1>File not found</h1>
      <p>Could not find: ${safeRelative || 'index.html'}</p>
      <p>Searched in: root, public/, dist/, build/, out/</p>
      <p><a href="/api/workspace/${session.id}/logs">View logs</a></p>
    </body></html>`);
    return;
  }

  console.log(`   ✅ Serving static file: ${path.relative(session.worktreePath, targetPath)}`);

  try {
    // Set proper MIME type based on file extension
    const ext = path.extname(targetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.ts': 'application/javascript; charset=utf-8',
      '.tsx': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.map': 'application/json; charset=utf-8',
    };

    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }

    // For HTML files, process environment variable placeholders
    if (ext === '.html') {
      const htmlContent = await fs.readFile(targetPath, 'utf-8');

      // Replace common React/build tool environment variable placeholders
      const processedHtml = htmlContent
        .replace(/%PUBLIC_URL%/g, '')  // Remove PUBLIC_URL placeholders
        .replace(/%REACT_APP_([^%]+)%/g, '')  // Remove REACT_APP_* placeholders
        .replace(/%VITE_([^%]+)%/g, '');  // Remove VITE_* placeholders

      console.log(`   📝 Processed HTML file (replaced env placeholders)`);
      res.send(processedHtml);
    } else {
      // For other files, send as-is
      res.sendFile(targetPath);
    }
  } catch (error) {
    console.error(`   ❌ Error serving file:`, (error as Error).message);
    applyRelaxedPreviewHeaders(res);
    res.status(404).send('File not found');
  }
});

async function validateStartupConfiguration(): Promise<void> {
  console.log('🔍 Validating GitHub token and permissions...');

  // Skip validation if no token is set
  if (!GITHUB_TOKEN) {
    console.log('⚠️  No GitHub token set - skipping validation');
    console.log('💡 Public repositories will work with rate limits');
    console.log('💡 Use the key icon in the app to add your PAT for private repos');
    return;
  }

  const tokenValidation = await validateGitHubToken();
  if (!tokenValidation.valid) {
    console.error('❌ GitHub token validation failed');
    console.error('Please check your GITHUB_TOKEN in .env.local file');
    process.exit(1);
  }

  console.log(`✅ GitHub token valid for user: ${tokenValidation.user}`);
  console.log(`📋 Token scopes: ${tokenValidation.scopes.join(', ')}`);

  if (!tokenValidation.scopes.includes('repo')) {
    console.warn('⚠️  WARNING: Token does not have "repo" scope');
    console.warn('   Private repositories may not be accessible');
    console.warn('   Generate a new token with "repo" scope at: https://github.com/settings/tokens');
  } else {
    console.log('✅ Token has "repo" scope - private repositories accessible');
  }

  if (ALLOWED_GITHUB_ORGS.length > 0) {
    console.log(`🔒 Repository access restricted to orgs: ${ALLOWED_GITHUB_ORGS.join(', ')}`);
  } else {
    console.log('🌐 Repository access: All repositories accessible by token');
  }

  console.log(`👤 Base GitHub user: ${BASE_GITHUB_USER}`);
}

async function bootstrap() {
  try {
    console.log('🚀 Starting GitHub Commit Workspace Runner...');

    await validateStartupConfiguration();

    await ensureDirectory(WORKSPACE_ROOT);
    console.log(`📁 Workspace directory: ${WORKSPACE_ROOT}`);

    app.listen(PORT, () => {
      console.log(`\n🎉 Server ready!`);
      console.log(`📡 Server listening on: ${PUBLIC_SERVER_URL}`);
      console.log(`🌐 Frontend should be available at: http://localhost:5173 (or http://localhost:3000 if using legacy config)`);
      console.log(`\n💡 To access private repositories:`);
      console.log(`   Option 1: Set GITHUB_TOKEN in .env.local file`);
      console.log(`   Option 2: Use the 🔑 key icon in the app to enter your PAT (stored in browser)`);
      console.log(`   Scopes needed: 'repo' for private repositories`);
      console.log(`\n🔒 Security features enabled:`);
      console.log(`   ✓ Input validation and sanitization`);
      console.log(`   ✓ Repository access verification`);
      console.log(`   ✓ Rate limiting (relaxed for localhost)`);
      console.log(`   ✓ Session management and cleanup`);
      console.log(`   ✓ Secure credential handling`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});