'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface XAccountAuthProps {
  onSuccess?: (account: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const XAccountAuthButton: React.FC<XAccountAuthProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const handleXAuth = useCallback(async () => {
    if (!token) {
      toast.error('Please login first');
      return;
    }

    setIsLoading(true);
    
    try {
      // 生成授权URL
      const response = await fetch('/api/x/auth/url', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate authorization URL');
      }

      // 打开授权弹窗
      const popup = window.open(
        data.auth_url,
        'x_auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open authorization window. Please allow popups.');
      }

      // 监听授权结果
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'X_AUTH_SUCCESS') {
          popup.close();
          window.removeEventListener('message', messageHandler);
          
          try {
            // 处理OAuth回调
            const callbackResponse = await fetch('/api/x/auth/callback', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                code: event.data.code,
                state: event.data.state
              })
            });

            const callbackData = await callbackResponse.json();

            if (callbackData.success) {
              toast.success('X account bound successfully!');
              onSuccess?.(callbackData.account);
            } else {
              throw new Error(callbackData.error || 'Failed to bind X account');
            }
          } catch (error) {
            console.error('OAuth callback error:', error);
            toast.error(error instanceof Error ? error.message : 'Binding failed');
            onError?.(error instanceof Error ? error.message : 'Binding failed');
          } finally {
            setIsLoading(false);
          }
        } else if (event.data.type === 'X_AUTH_ERROR') {
          popup.close();
          window.removeEventListener('message', messageHandler);
          const error = event.data.error || 'Authorization cancelled';
          toast.error(error);
          onError?.(error);
          setIsLoading(false);
        }
      };

      window.addEventListener('message', messageHandler);

      // 检查弹窗是否被关闭
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setIsLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('X auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Authorization failed');
      onError?.(error instanceof Error ? error.message : 'Authorization failed');
      setIsLoading(false);
    }
  }, [token, onSuccess, onError]);

  return (
    <button
      onClick={handleXAuth}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg
        hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Bind X Account
        </>
      )}
    </button>
  );
};

// OAuth回调处理页面组件
export const XOAuthCallback: React.FC = () => {
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      // 授权失败
      window.opener?.postMessage({
        type: 'X_AUTH_ERROR',
        error: error || 'Authorization failed'
      }, window.location.origin);
      window.close();
      return;
    }

    if (code && state) {
      // 授权成功
      window.opener?.postMessage({
        type: 'X_AUTH_SUCCESS',
        code,
        state
      }, window.location.origin);
      window.close();
    } else {
      // 参数缺失
      window.opener?.postMessage({
        type: 'X_AUTH_ERROR',
        error: 'Invalid authorization response'
      }, window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Processing authorization...</p>
      </div>
    </div>
  );
};