import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { loadConfig, saveConfig, validateGitHubToken } from '../utils/config.js';
import { formatOutput, handleError, logInfo, logSuccess, logError } from '../utils/output.js';

const configCommand = new Command('config');
configCommand.description('Configuration management commands');

configCommand
  .command('show')
  .description('Show current configuration')
  .option('-s, --sensitive', 'show sensitive values (tokens, etc.)')
  .action((options) => {
    try {
      const config = loadConfig();
      
      // Mask sensitive values unless explicitly requested
      const displayConfig = { ...config };
      if (!options.sensitive) {
        if (displayConfig.GITHUB_TOKEN) {
          displayConfig.GITHUB_TOKEN = `${displayConfig.GITHUB_TOKEN.substring(0, 8)}...`;
        }
      }
      
      formatOutput(displayConfig, 'json');
      
    } catch (error) {
      handleError(error);
    }
  });

configCommand
  .command('set')
  .description('Set configuration value')
  .argument('<key>', 'configuration key')
  .argument('<value>', 'configuration value')
  .action((key, value) => {
    try {
      const config = loadConfig();
      config[key] = value;
      saveConfig(config);
      
      logSuccess(`Configuration updated: ${key} = ${key.includes('TOKEN') ? '***' : value}`);
      
    } catch (error) {
      handleError(error);
    }
  });

configCommand
  .command('get')
  .description('Get configuration value')
  .argument('<key>', 'configuration key')
  .option('-s, --sensitive', 'show sensitive values')
  .action((key, options) => {
    try {
      const config = loadConfig();
      const value = config[key];
      
      if (!value) {
        logError(`Configuration key '${key}' not found`);
        return;
      }
      
      // Mask sensitive values unless explicitly requested
      let displayValue = value;
      if (!options.sensitive && key.includes('TOKEN')) {
        displayValue = `${value.substring(0, 8)}...`;
      }
      
      console.log(displayValue);
      
    } catch (error) {
      handleError(error);
    }
  });

configCommand
  .command('init')
  .description('Initialize configuration file')
  .option('-f, --force', 'overwrite existing configuration')
  .action((options) => {
    try {
      const configPath = '.env.local';
      
      if (fs.existsSync(configPath) && !options.force) {
        logError('Configuration file already exists. Use --force to overwrite.');
        return;
      }
      
      // Copy from env.example if it exists
      const examplePath = 'env.example';
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, configPath);
        logSuccess(`Configuration initialized from ${examplePath}`);
      } else {
        // Create default configuration
        const defaultConfig = `# GitHub Commit Workspace Runner Configuration
# Copy this file to .env.local and configure your settings

# Required: GitHub Personal Access Token with repo scope
GITHUB_TOKEN=your_github_token_here

# Server Configuration
SERVER_PORT=4000
PUBLIC_SERVER_URL=http://localhost:4000

# Workspace Configuration
WORKSPACE_ROOT=./workspaces

# Security Configuration (optional)
ALLOWED_GITHUB_ORGS=
MAX_FILE_SIZE=1048576
RATE_LIMIT_MAX_REQUESTS=60
SESSION_TIMEOUT_MINUTES=60
`;
        
        fs.writeFileSync(configPath, defaultConfig);
        logSuccess('Default configuration created');
      }
      
      logInfo(`Edit ${configPath} to configure your settings`);
      
    } catch (error) {
      handleError(error);
    }
  });

configCommand
  .command('validate')
  .description('Validate configuration')
  .action(async () => {
    try {
      const config = loadConfig();
      const issues = [];
      
      // Check required fields
      if (!config.GITHUB_TOKEN) {
        issues.push('GITHUB_TOKEN is required');
      } else {
        try {
          await validateGitHubToken(config.GITHUB_TOKEN);
          logSuccess('GitHub token is valid');
        } catch (error) {
          issues.push(`GitHub token validation failed: ${error.message}`);
        }
      }
      
      // Check optional but important fields
      if (!config.SERVER_PORT) {
        logInfo('SERVER_PORT not set, will use default (4000)');
      } else if (isNaN(parseInt(config.SERVER_PORT))) {
        issues.push('SERVER_PORT must be a number');
      }
      
      if (!config.WORKSPACE_ROOT) {
        logInfo('WORKSPACE_ROOT not set, will use default (./workspaces)');
      }
      
      if (config.MAX_FILE_SIZE && isNaN(parseInt(config.MAX_FILE_SIZE))) {
        issues.push('MAX_FILE_SIZE must be a number');
      }
      
      if (config.RATE_LIMIT_MAX_REQUESTS && isNaN(parseInt(config.RATE_LIMIT_MAX_REQUESTS))) {
        issues.push('RATE_LIMIT_MAX_REQUESTS must be a number');
      }
      
      if (config.SESSION_TIMEOUT_MINUTES && isNaN(parseInt(config.SESSION_TIMEOUT_MINUTES))) {
        issues.push('SESSION_TIMEOUT_MINUTES must be a number');
      }
      
      // Report results
      if (issues.length === 0) {
        logSuccess('Configuration is valid');
      } else {
        logError('Configuration validation failed:');
        issues.forEach(issue => logError(`  - ${issue}`));
        process.exit(1);
      }
      
    } catch (error) {
      handleError(error);
    }
  });

configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-f, --force', 'skip confirmation prompt')
  .action((options) => {
    try {
      if (!options.force) {
        // TODO: Add interactive confirmation
        logError('Use --force to confirm reset (interactive confirmation not yet implemented)');
        return;
      }
      
      const configPath = '.env.local';
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      
      // Reinitialize with defaults
      const initCommand = configCommand.commands.find(cmd => cmd.name() === 'init');
      initCommand.action({ force: true });
      
      logSuccess('Configuration reset to defaults');
      
    } catch (error) {
      handleError(error);
    }
  });

export default configCommand;
