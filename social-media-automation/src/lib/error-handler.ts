import { logError, logInfo, logger } from '@/lib/logger';

/**
 * 统一错误处理系统
 */

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
  suggestion?: string;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly suggestion?: string;
  public readonly details?: any;

  constructor(errorInfo: ErrorInfo) {
    super(errorInfo.message);
    this.name = 'AppError';
    this.code = errorInfo.code;
    this.retryable = errorInfo.retryable;
    this.userMessage = errorInfo.userMessage;
    this.suggestion = errorInfo.suggestion;
    this.details = errorInfo.details;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorMap = new Map<string, ErrorInfo>();

  private constructor() {
    this.initializeErrorDefinitions();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private initializeErrorDefinitions() {
    // 认证相关错误
    this.errorMap.set('AUTH_TOKEN_MISSING', {
      code: 'AUTH_TOKEN_MISSING',
      message: 'Authentication token is missing',
      retryable: false,
      userMessage: '请先登录后再试',
      suggestion: '请检查是否已正确登录，或重新登录'
    });

    this.errorMap.set('AUTH_TOKEN_EXPIRED', {
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      retryable: false,
      userMessage: '登录已过期，请重新登录',
      suggestion: '您的会话已过期，请重新登录以继续使用'
    });

    this.errorMap.set('AUTH_TOKEN_INVALID', {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Authentication token is invalid',
      retryable: false,
      userMessage: '认证信息无效',
      suggestion: '请重新登录获取新的认证信息'
    });

    // OAuth相关错误
    this.errorMap.set('OAUTH_STATE_EXPIRED', {
      code: 'OAUTH_STATE_EXPIRED',
      message: 'OAuth state has expired',
      retryable: true,
      userMessage: '授权链接已过期',
      suggestion: '请重新尝试授权'
    });

    this.errorMap.set('OAUTH_STATE_INVALID', {
      code: 'OAUTH_STATE_INVALID',
      message: 'OAuth state is invalid',
      retryable: true,
      userMessage: '授权状态无效',
      suggestion: '请重新尝试授权'
    });

    this.errorMap.set('OAUTH_CODE_INVALID', {
      code: 'OAUTH_CODE_INVALID',
      message: 'OAuth authorization code is invalid',
      retryable: true,
      userMessage: '授权码无效',
      suggestion: '请重新进行授权'
    });

    this.errorMap.set('OAUTH_TOKEN_EXCHANGE_FAILED', {
      code: 'OAUTH_TOKEN_EXCHANGE_FAILED',
      message: 'Failed to exchange authorization code for tokens',
      retryable: true,
      userMessage: 'Token交换失败',
      suggestion: '请检查应用配置或重新尝试授权'
    });

    // 网络相关错误
    this.errorMap.set('NETWORK_ERROR', {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      retryable: true,
      userMessage: '网络连接失败',
      suggestion: '请检查网络连接后重试'
    });

    this.errorMap.set('TIMEOUT_ERROR', {
      code: 'TIMEOUT_ERROR',
      message: 'Request timeout',
      retryable: true,
      userMessage: '请求超时',
      suggestion: '请稍后重试或检查网络连接'
    });

    // 业务逻辑错误
    this.errorMap.set('RESOURCE_NOT_FOUND', {
      code: 'RESOURCE_NOT_FOUND',
      message: 'Requested resource not found',
      retryable: false,
      userMessage: '请求的资源不存在',
      suggestion: '请检查资源ID或刷新页面'
    });

    this.errorMap.set('PERMISSION_DENIED', {
      code: 'PERMISSION_DENIED',
      message: 'Permission denied',
      retryable: false,
      userMessage: '没有权限执行此操作',
      suggestion: '请联系管理员获取相应权限'
    });

    this.errorMap.set('VALIDATION_ERROR', {
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      retryable: false,
      userMessage: '输入数据格式错误',
      suggestion: '请检查输入的数据格式'
    });

    // 外部服务错误
    this.errorMap.set('EXTERNAL_SERVICE_ERROR', {
      code: 'EXTERNAL_SERVICE_ERROR',
      message: 'External service error',
      retryable: true,
      userMessage: '外部服务暂时不可用',
      suggestion: '请稍后重试，如问题持续请联系客服'
    });

    this.errorMap.set('EXTERNAL_SERVICE_UNAVAILABLE', {
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
      message: 'External service is unavailable',
      retryable: true,
      userMessage: '外部服务暂时不可用',
      suggestion: '请稍后重试，如问题持续请联系客服'
    });

    // 数据库错误
    this.errorMap.set('DATABASE_ERROR', {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      retryable: true,
      userMessage: '数据操作失败',
      suggestion: '请稍后重试，如问题持续请联系技术支持'
    });

    // 默认错误
    this.errorMap.set('UNKNOWN_ERROR', {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred',
      retryable: false,
      userMessage: '发生了未知错误',
      suggestion: '请刷新页面重试，如问题持续请联系技术支持'
    });
  }

  public getErrorInfo(error: any): ErrorInfo {
    // 如果是AppError，直接返回
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        userMessage: error.userMessage,
        suggestion: error.suggestion
      };
    }

    // 根据错误类型和内容推断错误信息
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.code) {
      errorCode = error.code;
    } else if (typeof error === 'string') {
      // 尝试从字符串错误中识别
      if (error.includes('token') && error.includes('expired')) {
        errorCode = 'AUTH_TOKEN_EXPIRED';
      } else if (error.includes('token') && error.includes('invalid')) {
        errorCode = 'AUTH_TOKEN_INVALID';
      } else if (error.includes('network') || error.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
      } else if (error.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
      }
    } else if (error?.message) {
      const message = error.message.toLowerCase();
      if (message.includes('token') && message.includes('expired')) {
        errorCode = 'AUTH_TOKEN_EXPIRED';
      } else if (message.includes('token') && message.includes('invalid')) {
        errorCode = 'AUTH_TOKEN_INVALID';
      } else if (message.includes('network') || message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
      } else if (message.includes('timeout')) {
        errorCode = 'TIMEOUT_ERROR';
      } else if (message.includes('state') && message.includes('expired')) {
        errorCode = 'OAUTH_STATE_EXPIRED';
      } else if (message.includes('state') && message.includes('invalid')) {
        errorCode = 'OAUTH_STATE_INVALID';
      }
    }

    const errorInfo = this.errorMap.get(errorCode) || this.errorMap.get('UNKNOWN_ERROR')!;
    
    return {
      ...errorInfo,
      details: error?.details || error
    };
  }

  public logError(error: any, context?: any) {
    const errorInfo = this.getErrorInfo(error);
    
    // 结构化日志
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      code: errorInfo.code,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      retryable: errorInfo.retryable,
      context,
      stack: error?.stack
    };

    // 这里可以集成到外部日志服务
    logError('[AppError]', JSON.stringify(logEntry, null, 2););
  }

  public createErrorResponse(error: any): any {
    const errorInfo = this.getErrorInfo(error);
    
    return {
      success: false,
      error: errorInfo.userMessage,
      code: errorInfo.code,
      retryable: errorInfo.retryable,
      suggestion: errorInfo.suggestion,
      details: process.env.NODE_ENV === 'development' ? errorInfo.details : undefined,
      timestamp: new Date().toISOString()
    };
  }

  public handleApiError(error: any, context?: any): AppError {
    this.logError(error, context);
    
    const errorInfo = this.getErrorInfo(error);
    return new AppError(errorInfo);
  }
}

// 全局错误处理器实例
export const errorHandler = ErrorHandler.getInstance();

// 便捷函数
export function handleApiError(error: any, context?: any): AppError {
  return errorHandler.handleApiError(error, context);
}

export function createErrorResponse(error: any): any {
  return errorHandler.createErrorResponse(error);
}

export function logError(error: any, context?: any): void {
  errorHandler.logError(error, context);
}