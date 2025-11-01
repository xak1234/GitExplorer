import { Command } from 'commander';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { loadConfig } from '../utils/config.js';
import { formatOutput, handleError, logInfo, logSuccess, logError } from '../utils/output.js';

const workspaceCommand = new Command('workspace');
workspaceCommand.description('Workspace management commands');

workspaceCommand
  .command('prepare')
  .description('Prepare a workspace for a specific commit')
  .argument('<repo-url>', 'GitHub repository URL')
  .argument('<commit-sha>', 'Commit SHA to prepare')
  .option('-f, --force', 'force recreation of existing workspace')
  .action(async (repoUrl, commitSha, options) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      logInfo(`Preparing workspace for ${repoUrl} at commit ${commitSha}...`);
      
      const response = await axios.post(`${serverUrl}/api/prepare-workspace`, {
        repoUrl,
        commitSha,
        force: options.force
      });
      
      if (response.data.success) {
        logSuccess(`Workspace prepared successfully!`);
        formatOutput({
          sessionId: response.data.sessionId,
          workspacePath: response.data.workspacePath,
          status: 'prepared'
        }, 'json');
      } else {
        throw new Error(response.data.error || 'Failed to prepare workspace');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

workspaceCommand
  .command('start')
  .description('Start preview server for a workspace')
  .argument('<session-id>', 'Workspace session ID')
  .option('-p, --port <port>', 'preview port (auto-detected if not specified)')
  .action(async (sessionId, options) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      logInfo(`Starting preview for session ${sessionId}...`);
      
      const response = await axios.post(`${serverUrl}/api/start-preview`, {
        sessionId,
        port: options.port ? parseInt(options.port) : undefined
      });
      
      if (response.data.success) {
        logSuccess(`Preview started successfully!`);
        formatOutput({
          sessionId: response.data.sessionId,
          previewUrl: response.data.previewUrl,
          port: response.data.port,
          status: 'running'
        }, 'json');
      } else {
        throw new Error(response.data.error || 'Failed to start preview');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

workspaceCommand
  .command('stop')
  .description('Stop workspace and cleanup')
  .argument('<session-id>', 'Workspace session ID')
  .action(async (sessionId) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      logInfo(`Stopping workspace ${sessionId}...`);
      
      const response = await axios.post(`${serverUrl}/api/stop-workspace`, {
        sessionId
      });
      
      if (response.data.success) {
        logSuccess(`Workspace stopped and cleaned up successfully!`);
        formatOutput({
          sessionId: response.data.sessionId,
          status: 'stopped'
        }, 'json');
      } else {
        throw new Error(response.data.error || 'Failed to stop workspace');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

workspaceCommand
  .command('list')
  .description('List all active workspaces')
  .option('-a, --all', 'show all workspaces including stopped ones')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      const response = await axios.get(`${serverUrl}/api/workspaces`, {
        params: { all: options.all }
      });
      
      if (response.data.success) {
        const workspaces = response.data.workspaces;
        if (workspaces.length === 0) {
          logInfo('No workspaces found.');
          return;
        }
        
        formatOutput(workspaces.map(ws => ({
          sessionId: ws.sessionId,
          repository: ws.repoUrl,
          commit: ws.commitSha?.substring(0, 8),
          status: ws.status,
          previewUrl: ws.previewUrl || 'N/A',
          created: new Date(ws.createdAt).toLocaleString()
        })), 'table');
      } else {
        throw new Error(response.data.error || 'Failed to list workspaces');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

workspaceCommand
  .command('logs')
  .description('View logs for a workspace')
  .argument('<session-id>', 'Workspace session ID')
  .option('-f, --follow', 'follow log output')
  .option('-n, --lines <number>', 'number of lines to show', '50')
  .action(async (sessionId, options) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      if (options.follow) {
        logInfo(`Following logs for session ${sessionId} (Ctrl+C to stop)...`);
        // TODO: Implement WebSocket or SSE connection for real-time logs
        logError('Follow mode not yet implemented. Use without -f flag for static logs.');
        return;
      }
      
      const response = await axios.get(`${serverUrl}/api/workspace-logs/${sessionId}`, {
        params: { lines: parseInt(options.lines) }
      });
      
      if (response.data.success) {
        const logs = response.data.logs;
        logs.forEach(log => {
          console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level}: ${log.message}`);
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch logs');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

export default workspaceCommand;
