
import axios from 'axios';
import { Commit, FileNode, LogEntry } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:4000';

let githubToken: string | null = null;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - for regular API calls
});

// Add interceptor to include token in requests
client.interceptors.request.use((config) => {
  if (githubToken) {
    config.headers['X-GitHub-Token'] = githubToken;
  }
  return config;
});

export function setGitHubToken(token: string | null) {
  githubToken = token;
  if (token) {
    console.log('🔑 GitHub token set in API client');
  } else {
    console.log('🔑 GitHub token cleared from API client');
  }
}

export async function getServerConfig(): Promise<{ port: number; publicUrl: string; timestamp: string }> {
  const response = await client.get<{ port: number; publicUrl: string; timestamp: string }>('/api/config', {
    timeout: 5000, // 5 seconds - this should be instant
  });
  return response.data;
}

export async function testBackendConnection(): Promise<boolean> {
  try {
    await client.get('/api/config', { timeout: 3000 });
    console.log('✅ Backend server is reachable');
    return true;
  } catch (error) {
    console.error('❌ Backend server is NOT reachable:', error);
    console.error('💡 Make sure the backend server is running: npm run server');
    console.error(`💡 Expected backend at: ${API_BASE_URL}`);
    return false;
  }
}

export interface Repository {
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  isPrivate: boolean;
}

export async function getUserRepositories(username: string): Promise<Repository[]> {
  try {
    console.log(`📚 Fetching repositories for user: ${username}`);
    const response = await client.get<{ username: string; count: number; repos: Repository[] }>(
      `/api/user/${username}/repos`,
      { timeout: 10000 } // 10 seconds
    );
    const repos = response.data.repos;
    // Defensive check to ensure repos is an array
    if (!Array.isArray(repos)) {
      console.warn('⚠️ getUserRepositories: Expected array but got:', typeof repos, repos);
      return [];
    }
    console.log(`✅ Found ${response.data.count} repositories for ${username}`);
    return repos;
  } catch (error) {
    console.error(`❌ Failed to fetch repositories for ${username}:`, error);
    return [];
  }
}

export async function checkCommitPreviewable(repoUrl: string, sha: string): Promise<any> {
  try {
    console.log('📡 Checking preview for:', { repoUrl, sha, shaLength: sha?.length });
    const response = await client.post<any>('/api/commit-preview-check', { repoUrl, sha }, {
      timeout: 15000, // 15 seconds - this is a lightweight check
    });
    console.log('✅ Preview check response:', response.data);
    // Return the full response which now includes aiAnalysis
    return response.data;
  } catch (error) {
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as any;
      console.error('❌ Preview check failed:', {
        status: axiosError.response?.status,
        message: axiosError.response?.data?.error || axiosError.message,
        data: axiosError.response?.data,
        requestData: { repoUrl, sha, shaLength: sha?.length }
      });
    } else {
      console.error('❌ Preview check error:', error);
    }
    return { 
      previewable: false, 
      previewViabilityScore: 0,
      recommendation: 'not_recommended',
      basicIndicators: {
        hasPackageJson: false,
        hasIndexHtml: false,
        hasBuildFiles: false,
        hasSourceFiles: false,
        hasWebFiles: false,
        fileCount: 0
      },
      commitInfo: {
        message: 'Unknown',
        author: 'Unknown',
        filesChanged: 0
      }
    };
  }
}

export async function canPreviewCommit(repoUrl: string, sha: string): Promise<{
  canPreview: boolean;
  details: {
    hasPackageJson: boolean;
    hasIndexHtml: boolean;
    hasSrcIndex: boolean;
    isReactApp: boolean;
    isStaticSite: boolean;
  };
  reason: string;
}> {
  const response = await client.post<any>('/api/can-preview', { repoUrl, sha });
  return response.data;
}

export async function fetchCommits(repoUrl: string): Promise<Commit[]> {
  const response = await client.post<{ commits: Commit[] }>('/api/commits', { repoUrl });
  const commits = response.data.commits;
  // Defensive check to ensure commits is an array
  if (!Array.isArray(commits)) {
    console.warn('⚠️ fetchCommits: Expected array but got:', typeof commits, commits);
    return [];
  }
  return commits;
}

export async function fetchTree(repoUrl: string, sha: string): Promise<FileNode[]> {
  const response = await client.post<{ tree: FileNode[] }>('/api/tree', { repoUrl, sha });
  const tree = response.data.tree;
  // Defensive check to ensure tree is an array
  if (!Array.isArray(tree)) {
    console.warn('⚠️ fetchTree: Expected array but got:', typeof tree, tree);
    return [];
  }
  return tree;
}

export async function fetchFileContent(repoUrl: string, sha: string, filePath: string): Promise<string> {
  const response = await client.post<{ content: string }>('/api/file', { repoUrl, sha, path: filePath });
  return response.data.content;
}

// Combined function that downloads commit and starts preview in one action
export async function startPreview(repoUrl: string, sha: string): Promise<{ sessionId: string; previewUrl: string }> {
  // Use much longer timeout for the combined download+launch operation
  // This includes: git clone/fetch, worktree creation, npm install (can be very slow), and dev server startup
  const response = await client.post<{ sessionId: string; previewUrl: string }>('/api/workspace/start-preview', { repoUrl, sha }, {
    timeout: 300000, // 5 minutes - npm install can take a long time
  });
  return response.data;
}

// Legacy functions for backward compatibility (can be removed later)
export async function prepareWorkspace(repoUrl: string, sha: string): Promise<{ sessionId: string }> {
  const response = await client.post<{ sessionId: string }>('/api/workspace/prepare', { repoUrl, sha }, {
    timeout: 300000, // 5 minutes - git operations + npm install can be slow
  });
  return response.data;
}

export async function runWorkspace(sessionId: string): Promise<{ previewUrl: string }> {
  const response = await client.post<{ previewUrl: string }>('/api/workspace/run', { sessionId }, {
    timeout: 180000, // 3 minutes - dev server startup can be slow
  });
  return response.data;
}

export async function stopWorkspace(sessionId: string): Promise<void> {
  await client.post('/api/workspace/stop', { sessionId });
}

export async function launchMiniWindow(url: string): Promise<void> {
  try {
    console.log(`🚀 Launching mini window for: ${url}`);
    await client.post('/api/workspace/launch-mini', { url }, { timeout: 5000 });
    console.log('✅ Mini window launch request sent');
  } catch (error) {
    console.error('❌ Failed to launch mini window:', error);
  }
}

export function streamLogs(sessionId: string, onLog: (log: LogEntry) => void): EventSource {
  const url = `${API_BASE_URL}/api/workspace/${sessionId}/logs`;
  console.log('📡 Opening EventSource for logs:', url);
  const source = new EventSource(url);

  source.onopen = () => {
    console.log('✅ Log stream connected');
  };

  source.onmessage = (event) => {
    console.log('📨 Log received:', event.data);
    try {
      const payload = JSON.parse(event.data) as { timestamp: string; message: string; type: LogEntry['type'] };
      const logEntry = {
        timestamp: new Date(payload.timestamp),
        message: payload.message,
        type: payload.type,
      };
      console.log('📝 Parsed log entry:', logEntry);
      onLog(logEntry);
    } catch (error) {
      console.error('❌ Failed to parse log event:', error, 'Raw data:', event.data);
    }
  };

  source.onerror = (event) => {
    console.error('❌ Log stream error:', event, 'ReadyState:', source.readyState);
    if (source.readyState === EventSource.CLOSED) {
      console.error('❌ Log stream closed');
    }
  };

  return source;
}
