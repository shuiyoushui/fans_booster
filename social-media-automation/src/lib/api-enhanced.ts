/**
 * 增强的API调用工具，集成统一错误处理
 */

import { useCallback } from 'react';
import { createErrorResponse, logError } from './error-handler';

export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  context?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  suggestion?: string;
  details?: any;
  timestamp: string;
}

export class EnhancedApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;

  constructor(options: {
    baseUrl?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultTimeout = options.timeout || 10000;
    this.defaultRetries = options.retries || 2;
    this.defaultRetryDelay = options.retryDelay || 1000;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequestWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      skipAuth = false,
      context,
      ...fetchOptions
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    let lastError: any;

    // 准备请求头
    const headers = new Headers(fetchOptions.headers);
    
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!headers.has('Content-Type') && (fetchOptions.body && !(fetchOptions.body instanceof FormData))) {
      headers.set('Content-Type', 'application/json');
    }

    const enhancedOptions: RequestInit = {
      ...fetchOptions,
      headers
    };

    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.makeRequestWithTimeout(url, enhancedOptions, timeout);
        
        // 处理HTTP错误状态
        if (!response.ok) {
          let errorData: any;
          
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }

          // 认证错误不重试
          if (response.status === 401 || response.status === 403) {
            logError({
              code: response.status === 401 ? 'AUTH_TOKEN_INVALID' : 'PERMISSION_DENIED',
              message: errorData.error || `HTTP ${response.status}`,
              details: errorData
            }, context);

            return createErrorResponse({
              code: response.status === 401 ? 'AUTH_TOKEN_INVALID' : 'PERMISSION_DENIED',
              message: errorData.error || `HTTP ${response.status}`,
              details: errorData
            });
          }

          // 其他HTTP错误
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        // 成功响应
        const data = await response.json();
        
        return {
          success: true,
          data,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        
        // 网络错误可以重试
        if (attempt < retries && this.isRetryableError(error)) {
          logError({
            code: 'NETWORK_ERROR',
            message: `Request failed, retrying... (${attempt + 1}/${retries + 1})`,
            details: error
          }, context);
          
          await this.sleep(retryDelay * Math.pow(2, attempt)); // 指数退避
          continue;
        }
        
        // 不可重试错误或重试次数已用完
        break;
      }
    }

    // 所有重试都失败了
    logError(lastError, context);
    return createErrorResponse(lastError);
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    
    return errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('fetch') ||
           errorMessage.includes('connection') ||
           (error.code && ['NETWORK_ERROR', 'TIMEOUT_ERROR'].includes(error.code));
  }

  // 便捷方法
  async get<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = any>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}

// 创建默认客户端实例
export const apiClient = new EnhancedApiClient({
  timeout: 10000,
  retries: 2,
  retryDelay: 1000
});

// Hook for React components
export function useEnhancedApi() {
  const request = useCallback(async <T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    return apiClient.request<T>(endpoint, options);
  }, []);

  return {
    request,
    get: useCallback(<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => 
      apiClient.get<T>(endpoint, options), []),
    post: useCallback(<T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => 
      apiClient.post<T>(endpoint, data, options), []),
    put: useCallback(<T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => 
      apiClient.put<T>(endpoint, data, options), []),
    delete: useCallback(<T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => 
      apiClient.delete<T>(endpoint, options), []),
    patch: useCallback(<T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => 
      apiClient.patch<T>(endpoint, data, options), [])
  };
}