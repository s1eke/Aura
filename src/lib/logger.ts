/**
 * Log levels for the application
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * Parser for log level from environment variable
 */
function getLogLevel(): LogLevel {
    // Check if we are in a browser environment or server environment
    const envLevel = typeof process !== 'undefined' && process.env ? process.env.LOG_LEVEL : undefined;

    if (!envLevel) {
        return LogLevel.INFO; // Default to INFO
    }

    switch (envLevel.toLowerCase()) {
        case 'debug':
            return LogLevel.DEBUG;
        case 'info':
            return LogLevel.INFO;
        case 'warn':
            return LogLevel.WARN;
        case 'error':
            return LogLevel.ERROR;
        default:
            return LogLevel.INFO;
    }
}

class Logger {
    private currentLevel: LogLevel;

    constructor() {
        this.currentLevel = getLogLevel();
    }

    private formatMessage(level: string, message: string, ...args: unknown[]): void {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? args : '';
        // Use console methods appropriately
        switch (level) {
            case 'DEBUG':
                console.debug(`[${timestamp}] [${level}] ${message}`, ...formattedArgs);
                break;
            case 'INFO':
                console.info(`[${timestamp}] [${level}] ${message}`, ...formattedArgs);
                break;
            case 'WARN':
                console.warn(`[${timestamp}] [${level}] ${message}`, ...formattedArgs);
                break;
            case 'ERROR':
                console.error(`[${timestamp}] [${level}] ${message}`, ...formattedArgs);
                break;
        }
    }

    public debug(message: string, ...args: unknown[]): void {
        if (this.currentLevel <= LogLevel.DEBUG) {
            this.formatMessage('DEBUG', message, ...args);
        }
    }

    public info(message: string, ...args: unknown[]): void {
        if (this.currentLevel <= LogLevel.INFO) {
            this.formatMessage('INFO', message, ...args);
        }
    }

    public warn(message: string, ...args: unknown[]): void {
        if (this.currentLevel <= LogLevel.WARN) {
            this.formatMessage('WARN', message, ...args);
        }
    }

    public error(message: string, ...args: unknown[]): void {
        if (this.currentLevel <= LogLevel.ERROR) {
            this.formatMessage('ERROR', message, ...args);
        }
    }

    // Method to manually set level if needed at runtime
    public setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }
}

export const logger = new Logger();
