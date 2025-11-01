export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    date: string;
  };
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'log' | 'info' | 'success' | 'error';
}

export type WorkspaceStatus = 'stopped' | 'preparing' | 'running' | 'error';

export interface WorkspaceState {
  status: WorkspaceStatus;
  isPrepared: boolean;
  sessionId: string | null;
  logs: LogEntry[];
  previewUrl: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sha: string;
  size: number | null;
  children?: FileNode[];
}
