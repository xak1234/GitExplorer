import { Command } from 'commander';
import { spawn, exec } from 'child_process';
import axios from 'axios';
import path from 'path';
import { loadConfig } from '../utils/config.js';
import { formatOutput, handleError, logInfo, logSuccess, logError, logWarn } from '../utils/output.js';

const serverCommand = new Command('server');
serverCommand.description('Server management commands');

serverCommand
  .command('start')
  .description('Start the backend server')
  .option('-p, --port <port>', 'server port', '4000')
  .option('-d, --detach', 'run server in background')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const port = options.port || config.SERVER_PORT || 4000;
      
      logInfo(`Starting server on port ${port}...`);
      
      const serverProcess = spawn('npm', ['run', 'server'], {
        stdio: options.detach ? 'ignore' : 'inherit',
        detached: options.detach,
        env: { ...process.env, PORT: port }
      });
      
      if (options.detach) {
        serverProcess.unref();
        logSuccess(`Server started in background (PID: ${serverProcess.pid})`);
        
        // Wait a moment and check if server is responding
        setTimeout(async () => {
          try {
            await axios.get(`http://localhost:${port}/api/health`);
            logSuccess(`Server is responding at http://localhost:${port}`);
          } catch (error) {
            logWarn('Server may still be starting up. Check logs if issues persist.');
          }
        }, 3000);
      } else {
        logInfo('Server running in foreground. Press Ctrl+C to stop.');
        
        process.on('SIGINT', () => {
          logInfo('Stopping server...');
          serverProcess.kill('SIGTERM');
          process.exit(0);
        });
        
        serverProcess.on('exit', (code) => {
          if (code === 0) {
            logSuccess('Server stopped gracefully');
          } else {
            logError(`Server exited with code ${code}`);
          }
        });
      }
      
    } catch (error) {
      handleError(error);
    }
  });

serverCommand
  .command('stop')
  .description('Stop the backend server')
  .action(async () => {
    try {
      logInfo('Stopping server...');
      
      // Try graceful shutdown first
      try {
        const config = loadConfig();
        const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
        await axios.post(`${serverUrl}/api/shutdown`);
        logSuccess('Server stopped gracefully');
        return;
      } catch (error) {
        // If graceful shutdown fails, try to kill process
        logWarn('Graceful shutdown failed, attempting to kill process...');
      }
      
      // Find and kill server processes
      exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
        if (error) {
          logError('Failed to find server processes');
          return;
        }
        
        const lines = stdout.split('\n');
        let killed = false;
        
        lines.forEach(line => {
          if (line.includes('server') || line.includes('tsx')) {
            const parts = line.split(',');
            if (parts.length > 1) {
              const pid = parts[1].replace(/"/g, '');
              exec(`taskkill /PID ${pid} /F`, (killError) => {
                if (!killError) {
                  logSuccess(`Killed server process (PID: ${pid})`);
                  killed = true;
                }
              });
            }
          }
        });
        
        if (!killed) {
          logWarn('No server processes found to kill');
        }
      });
      
    } catch (error) {
      handleError(error);
    }
  });

serverCommand
  .command('status')
  .description('Check server status')
  .action(async () => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      logInfo(`Checking server status at ${serverUrl}...`);
      
      const response = await axios.get(`${serverUrl}/api/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        logSuccess('Server is running and healthy');
        formatOutput({
          status: 'healthy',
          url: serverUrl,
          uptime: response.data.uptime || 'unknown',
          version: response.data.version || 'unknown',
          activeWorkspaces: response.data.activeWorkspaces || 0
        }, 'json');
      } else {
        logWarn(`Server responded with status ${response.status}`);
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        logError('Server is not running or not accessible');
        formatOutput({ status: 'offline' }, 'json');
      } else {
        handleError(error);
      }
    }
  });

serverCommand
  .command('restart')
  .description('Restart the backend server')
  .option('-p, --port <port>', 'server port', '4000')
  .action(async (options) => {
    try {
      logInfo('Restarting server...');
      
      // Stop server first
      await new Promise((resolve) => {
        const stopCommand = serverCommand.commands.find(cmd => cmd.name() === 'stop');
        stopCommand.action();
        setTimeout(resolve, 2000); // Wait 2 seconds for cleanup
      });
      
      // Start server
      const startCommand = serverCommand.commands.find(cmd => cmd.name() === 'start');
      startCommand.action({ ...options, detach: true });
      
    } catch (error) {
      handleError(error);
    }
  });

serverCommand
  .command('logs')
  .description('View server logs')
  .option('-f, --follow', 'follow log output')
  .option('-n, --lines <number>', 'number of lines to show', '50')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const serverUrl = config.PUBLIC_SERVER_URL || 'http://localhost:4000';
      
      if (options.follow) {
        logInfo('Following server logs (Ctrl+C to stop)...');
        // TODO: Implement WebSocket or SSE connection for real-time logs
        logError('Follow mode not yet implemented. Use without -f flag for static logs.');
        return;
      }
      
      const response = await axios.get(`${serverUrl}/api/server-logs`, {
        params: { lines: parseInt(options.lines) }
      });
      
      if (response.data.success) {
        const logs = response.data.logs;
        logs.forEach(log => {
          console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level}: ${log.message}`);
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch server logs');
      }
      
    } catch (error) {
      handleError(error);
    }
  });

export default serverCommand;
