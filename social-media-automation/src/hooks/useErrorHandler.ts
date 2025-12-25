'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { AppError, errorHandler, handleApiError } from '@/lib/error-handler';

import { logError, logInfo, logger } from '@/lib/logger';

export interface UseErrorHandlerReturn {
  error: AppError | null;
  isLoading: boolean;
  handleAsyncOperation: <T>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showToast?: boolean;
      onError?: (error: AppError) => void;
    }
  ) => Promise<T | null>;
  clearError: () => void;
  retryOperation: () => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastOperation, setLastOperation] = useState<(() => Promise<any>) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      showToast?: boolean;
      onError?: (error: AppError) => void;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    clearError();
    setLastOperation(() => operation);

    try {
      const result = await operation();
      
      // 成功处理
      if (options.showToast !== false && options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return result;
    } catch (err) {
      const appError = handleApiError(err, {
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
      });
      
      setError(appError);
      
      // 调用自定义错误处理
      if (options.onError) {
        options.onError(appError);
      }
      
      // 显示错误提示
      if (options.showToast !== false) {
        const message = options.errorMessage || appError.userMessage;
        
        if (appError.retryable) {
          toast.error(`${message} (可重试)`, {
            duration: 5000
          });
          // 显示重试提示
          setTimeout(() => {
            toast('是否重试？', {
              icon: '🔄',
              duration: 5000
            });
          }, 1000);
        } else {
          toast.error(message, {
            duration: 4000
          });
          
          // 如果有建议，稍后显示
          if (appError.suggestion) {
            setTimeout(() => {
              toast(appError.suggestion!, {
                duration: 3000,
                icon: '💡'
              });
            }, 1000);
          }
        }
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  const retryOperation = useCallback(() => {
    if (lastOperation) {
      handleAsyncOperation(lastOperation);
    }
  }, [lastOperation, handleAsyncOperation]);

  return {
    error,
    isLoading,
    handleAsyncOperation,
    clearError,
    retryOperation
  };
}

// 全局错误边界Hook
export function useGlobalErrorHandler() {
  const handleUnhandledError = useCallback((event: ErrorEvent) => {
    const appError = handleApiError(event.error, {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    logError('Unhandled error:', appError);;
    toast.error('发生了未预期的错误，请刷新页面重试');
  }, []);

  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const appError = handleApiError(event.reason, {
      type: 'unhandled_rejection'
    });
    
    logError('Unhandled promise rejection:', appError);;
    toast.error('请求处理失败，请重试');
  }, []);

  // 设置全局错误处理
  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  }

  return {
    removeHandlers: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleUnhandledError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    }
  };
}