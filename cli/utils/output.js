import util from 'util';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Check if colors should be disabled
 */
function shouldUseColors() {
  return process.stdout.isTTY && !process.argv.includes('--no-color');
}

/**
 * Apply color to text if colors are enabled
 */
function colorize(text, color) {
  if (!shouldUseColors()) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Log info message
 */
function logInfo(message) {
  console.log(colorize('ℹ', 'blue') + ' ' + message);
}

/**
 * Log success message
 */
function logSuccess(message) {
  console.log(colorize('✓', 'green') + ' ' + colorize(message, 'green'));
}

/**
 * Log warning message
 */
function logWarn(message) {
  console.log(colorize('⚠', 'yellow') + ' ' + colorize(message, 'yellow'));
}

/**
 * Log error message
 */
function logError(message) {
  console.error(colorize('✗', 'red') + ' ' + colorize(message, 'red'));
}

/**
 * Format and display output in various formats
 */
function formatOutput(data, format = 'json') {
  switch (format.toLowerCase()) {
    case 'json':
      console.log(JSON.stringify(data, null, 2));
      break;
      
    case 'table':
      if (Array.isArray(data) && data.length > 0) {
        console.table(data);
      } else if (typeof data === 'object' && data !== null) {
        console.table([data]);
      } else {
        console.log(data);
      }
      break;
      
    case 'yaml':
      // Simple YAML-like output
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          console.log(`${key}: ${value}`);
        }
      } else {
        console.log(data);
      }
      break;
      
    case 'list':
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          console.log(`${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`);
        });
      } else {
        console.log(data);
      }
      break;
      
    default:
      console.log(data);
  }
}

/**
 * Handle and display errors consistently
 */
function handleError(error) {
  if (error.response) {
    // HTTP error
    logError(`HTTP ${error.response.status}: ${error.response.data?.error || error.response.statusText}`);
    if (error.response.data?.details) {
      console.error(colorize('Details:', 'dim'), error.response.data.details);
    }
  } else if (error.code) {
    // System error
    logError(`${error.code}: ${error.message}`);
  } else {
    // Generic error
    logError(error.message || 'An unknown error occurred');
  }
  
  // Show stack trace in verbose mode
  if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
    console.error(colorize('Stack trace:', 'dim'));
    console.error(error.stack);
  }
  
  process.exit(1);
}

/**
 * Display a spinner for long-running operations
 */
class Spinner {
  constructor(message = 'Loading...') {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
  }
  
  start() {
    if (!shouldUseColors()) {
      console.log(this.message);
      return;
    }
    
    this.interval = setInterval(() => {
      process.stdout.write(`\r${colorize(this.frames[this.frameIndex], 'cyan')} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 100);
  }
  
  stop(finalMessage) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    if (shouldUseColors()) {
      process.stdout.write('\r\x1b[K'); // Clear line
    }
    
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
  
  succeed(message) {
    this.stop(colorize('✓', 'green') + ' ' + colorize(message || this.message, 'green'));
  }
  
  fail(message) {
    this.stop(colorize('✗', 'red') + ' ' + colorize(message || this.message, 'red'));
  }
}

/**
 * Create a progress bar
 */
function createProgressBar(total, message = 'Progress') {
  let current = 0;
  
  return {
    update(value, customMessage) {
      current = value;
      const percentage = Math.round((current / total) * 100);
      const barLength = 20;
      const filledLength = Math.round((barLength * current) / total);
      const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      
      const displayMessage = customMessage || message;
      process.stdout.write(`\r${displayMessage}: [${colorize(bar, 'cyan')}] ${percentage}%`);
      
      if (current >= total) {
        console.log(); // New line when complete
      }
    },
    
    increment(customMessage) {
      this.update(current + 1, customMessage);
    }
  };
}

export {
  logInfo,
  logSuccess,
  logWarn,
  logError,
  formatOutput,
  handleError,
  colorize,
  shouldUseColors,
  Spinner,
  createProgressBar
};
