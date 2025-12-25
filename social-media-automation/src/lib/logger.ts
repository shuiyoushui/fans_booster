// 简单的日志系统
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getCurrentUserId(),
      requestId: this.getRequestId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // 从上下文或请求中获取用户ID
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('userId') || undefined;
    }
    return undefined;
  }

  private getRequestId(): string | undefined {
    // 从上下文或请求中获取请求ID
    return undefined;
  }

  debug(message: string, context?: any): void {
    const entry = this.createLogEntry('debug', message, context);
    this.addLog(entry);
    console.debug(`[DEBUG] ${message}`, context);
  }

  info(message: string, context?: any): void {
    const entry = this.createLogEntry('info', message, context);
    this.addLog(entry);
    console.info(`[INFO] ${message}`, context);
  }

  warn(message: string, context?: any): void {
    const entry = this.createLogEntry('warn', message, context);
    this.addLog(entry);
    console.warn(`[WARN] ${message}`, context);
  }

  error(message: string, context?: any): void {
    const entry = this.createLogEntry('error', message, context);
    this.addLog(entry);
    console.error(`[ERROR] ${message}`, context);
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// 导出单例实例
export const logger = new Logger();

// 导出便捷函数
export const logDebug = (message: string, context?: any) => logger.debug(message, context);
export const logInfo = (message: string, context?: any) => logger.info(message, context);
export const logWarn = (message: string, context?: any) => logger.warn(message, context);
export const logError = (message: string, context?: any) => logger.error(message, context);