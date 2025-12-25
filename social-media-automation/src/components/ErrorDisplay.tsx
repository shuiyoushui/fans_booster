'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppError } from '@/lib/error-handler';

interface ErrorDisplayProps {
  error: AppError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, onDismiss, className = '' }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-start space-x-3">
          {/* 错误图标 */}
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>

          {/* 错误内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-red-800">
                {error.userMessage}
              </h3>
              
              {/* 错误代码 */}
              {error.code && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  {error.code}
                </span>
              )}
            </div>

            {/* 错误建议 */}
            {error.suggestion && (
              <p className="mt-1 text-sm text-red-700">
                <span className="font-medium">建议：</span>
                {error.suggestion}
              </p>
            )}

            {/* 操作按钮 */}
            <div className="mt-3 flex space-x-2">
              {error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重试
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 开发环境显示详细信息 */}
        {process.env.NODE_ENV === 'development' && error.details && (
          <details className="mt-3 pt-3 border-t border-red-200">
            <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
              详细信息 (开发模式)
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// 加载状态组件
interface LoadingDisplayProps {
  message?: string;
  className?: string;
}

export function LoadingDisplay({ message = '加载中...', className = '' }: LoadingDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center justify-center p-4 ${className}`}
    >
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    </motion.div>
  );
}

// 空状态组件
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className = '' }: EmptyStateProps) {
  const defaultIcon = (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-12 ${className}`}
    >
      <div className="flex justify-center mb-4">
        {icon || defaultIcon}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}