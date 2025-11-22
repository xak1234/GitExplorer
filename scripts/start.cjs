#!/usr/bin/env node

/**
 * Production bundler and starter for GitHub Commit Workspace Runner
 * Builds frontend, compiles backend (optional), and starts the server
 * 
 * Usage:
 *   node scripts/start.js [--dev]
 * 
 * Options:
 *   --dev    Start in development mode (runs concurrently)
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function log(message, color = 'white') {
  const colors = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

async function run(command, args, description) {
  return new Promise((resolve, reject) => {
    log(`\n${description}...`, 'yellow');
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} succeeded`, 'green');
        resolve();
      } else {
        log(`❌ ${description} failed with code ${code}`, 'red');
        reject(new Error(`${description} failed`));
      }
    });

    child.on('error', (err) => {
      log(`❌ ${description} error: ${err.message}`, 'red');
      reject(err);
    });
  });
}

async function main() {
  try {
    log('\n🚀 Starting GitHub Commit Workspace Runner...', 'cyan');

    if (isDev) {
      log('\n📝 Development mode - running frontend and backend concurrently', 'cyan');
      log('Use Ctrl+C to stop both servers', 'white');
      
      await run(npmCmd, ['run', 'dev:full'], '🔄 Starting development servers');
    } else {
      log('\n📝 Production mode - building and serving bundled app', 'cyan');

      // Build frontend
      await run(npmCmd, ['run', 'build'], '📦 Building frontend');

      // Check if dist/public exists
      const publicPath = path.join(process.cwd(), 'dist', 'public');
      if (!fs.existsSync(publicPath)) {
        throw new Error('Frontend build output not found at dist/public');
      }

      log(`✅ Frontend built successfully at ${publicPath}`, 'green');

      // Start server
      log('\n🎉 Starting server with bundled frontend...', 'green');
      log('📡 Server will be available at http://localhost:4000', 'cyan');
      
      const child = spawn(npmCmd, ['run', 'server'], {
        stdio: 'inherit',
        shell: isWindows,
      });

      child.on('error', (err) => {
        log(`❌ Server error: ${err.message}`, 'red');
        process.exit(1);
      });

      // Keep process alive
      await new Promise(() => {});
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
