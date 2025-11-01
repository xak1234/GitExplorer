#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';

// Import command modules
import repoCommands from './commands/repo.js';
import workspaceCommands from './commands/workspace.js';
import serverCommands from './commands/server.js';
import configCommands from './commands/config.js';

const program = new Command();

program
  .name('ghcr')
  .description('GitHub Commit Workspace Runner CLI')
  .version('1.0.0');

// Add command groups
program.addCommand(repoCommands);
program.addCommand(workspaceCommands);
program.addCommand(serverCommands);
program.addCommand(configCommands);

// Global options
program
  .option('-c, --config <path>', 'path to config file', '.env.local')
  .option('-v, --verbose', 'verbose output')
  .option('--no-color', 'disable colored output');

// Parse command line arguments
program.parse();
