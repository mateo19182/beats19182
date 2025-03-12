/**
 * Simple logging utility for server-side code
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

const COLORS = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[34m',  // Blue
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  success: '\x1b[32m', // Green
  reset: '\x1b[0m',  // Reset
};

const ICONS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
};

/**
 * Log a message with timestamp and optional context
 */
export function log(
  message: string, 
  level: LogLevel = 'info', 
  context?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const icon = ICONS[level];
  const color = COLORS[level];
  const reset = COLORS.reset;
  
  // Format: [TIMESTAMP] LEVEL: Message
  const logMessage = `${color}${icon} [${timestamp}] ${level.toUpperCase()}: ${message}${reset}`;
  
  // Log to console with appropriate level
  switch (level) {
    case 'debug':
      console.debug(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'error':
      console.error(logMessage);
      break;
    default:
      console.log(logMessage);
  }
  
  // Log additional context if provided
  if (context) {
    console.log(`${color}Context:${reset}`, context);
  }
}

// Convenience methods
export const logger = {
  debug: (message: string, context?: Record<string, any>) => log(message, 'debug', context),
  info: (message: string, context?: Record<string, any>) => log(message, 'info', context),
  warn: (message: string, context?: Record<string, any>) => log(message, 'warn', context),
  error: (message: string, context?: Record<string, any>) => log(message, 'error', context),
  success: (message: string, context?: Record<string, any>) => log(message, 'success', context),
}; 