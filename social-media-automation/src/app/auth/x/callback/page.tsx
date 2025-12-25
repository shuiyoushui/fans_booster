'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function XOAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code || !state) {
          throw new Error('缺少必要的参数');
        }

        // 多重fallback机制获取token
        let token: string | null = null;
        
        // 1. 首先尝试从URL参数获取（最可靠）
        const urlToken = searchParams.get('token');
        if (urlToken) {
          token = urlToken;
          console.log('Token found in URL parameters');
        }
        
        // 2. fallback到sessionStorage
        if (!token) {
          token = sessionStorage.getItem('temp_auth_token');
          if (token) {
            console.log('Token found in sessionStorage');
          }
        }
        
        // 3. 最后尝试从localStorage获取
        if (!token) {
          token = localStorage.getItem('token');
          if (token) {
            console.log('Token found in localStorage');
          }
        }
        
        if (!token) {
          throw new Error('认证信息缺失：无法获取有效的认证令牌');
        }

        // 调用回调API
        const response = await fetch('/api/x/auth/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            code,
            state,
            user_preferences: {
              is_primary: false,
              auto_grow_enabled: false
            }
          })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('X账号绑定成功！');
          
          // 通知父窗口成功
          opener.postMessage({
            type: 'X_OAUTH_SUCCESS',
            code,
            state,
            account: data.account
          }, window.location.origin);
          
          // 3秒后关闭窗口
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          // 传递完整的错误数据，包括自动重试信息
          throw new Error(JSON.stringify(data));
        }

      } catch (error) {
        setStatus('error');
        
        let errorMessage = error instanceof Error ? error.message : '未知错误';
        let errorData = null;
        
        // 尝试解析JSON格式的错误信息
        try {
          errorData = JSON.parse(errorMessage);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // 如果不是JSON格式，保持原始错误信息
          errorData = { error: errorMessage };
        }
        
        setMessage(errorMessage);
        
        // 通知父窗口失败，传递完整的错误数据
        const opener = window.opener;
        if (opener) {
          opener.postMessage({
            type: 'X_OAUTH_ERROR',
            error: errorMessage,
            data: errorData
          }, window.location.origin);
        }
        
        // 5秒后关闭窗口
        setTimeout(() => {
          window.close();
        }, 5000);
      } finally {
        // 清理临时token
        sessionStorage.removeItem('temp_auth_token');
      }
    };

    // 延迟执行，确保页面完全加载
    setTimeout(handleCallback, 100);
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {getStatusIcon()}
        
        <h1 className={`text-2xl font-bold mb-2 ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {status === 'loading' ? '处理授权中...' :
           status === 'success' ? '授权成功' :
           '授权失败'}
        </h1>
        
        <p className={`text-gray-600 mb-4 ${
          status === 'loading' ? 'animate-pulse' : ''
        }`}>
          {message}
        </p>
        
        {status === 'loading' && (
          <div className="space-y-2 text-sm text-gray-500">
            <p>正在验证授权信息...</p>
            <p>请稍候，此窗口将自动关闭</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-3">
            <p className="text-green-600">您的X账号已成功绑定</p>
            <p className="text-sm text-gray-500">此窗口将在3秒后自动关闭</p>
            <button
              onClick={() => window.close()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              立即关闭
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-red-600">{message}</p>
            <p className="text-sm text-gray-500">此窗口将在5秒后自动关闭</p>
            <button
              onClick={() => window.close()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              立即关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function XOAuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <XOAuthCallbackInner />
    </Suspense>
  );
}