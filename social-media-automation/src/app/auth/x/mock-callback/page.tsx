'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function XOAuthMockCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processMockCallback = async () => {
      try {
        const state = searchParams.get('state');
        const code = searchParams.get('code');

        if (!state || !code) {
          throw new Error('Missing mock callback parameters');
        }

        console.log('DEV MODE: Processing mock callback', {
          state: state?.substring(0, 8) + '...',
          code: code?.substring(0, 20) + '...'
        });

        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        setStatus('success');
        setMessage('模拟授权成功！这是开发环境的测试流程。');

        // 模拟自动关闭
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '未知错误');
        
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    processMockCallback();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {getStatusIcon()}
        
        <h1 className={`text-2xl font-bold mb-2 ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {status === 'processing' ? '处理模拟授权中...' :
           status === 'success' ? '模拟授权成功' :
           '模拟授权失败'}
        </h1>
        
        <p className={`text-gray-600 mb-4 ${
          status === 'processing' ? 'animate-pulse' : ''
        }`}>
          {message}
        </p>
        
        {status === 'processing' && (
          <div className="space-y-2 text-sm text-gray-500">
            <p>🔧 开发环境模拟流程</p>
            <p>此窗口将在处理完成后自动关闭</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                ✅ 开发环境模拟授权成功
              </p>
              <p className="text-green-600 text-xs mt-1">
                这是用于测试的模拟流程，实际生产环境需要真实的X开发者凭据
              </p>
            </div>
            <button
              onClick={() => window.close()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              立即关闭
            </button>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                ❌ 模拟授权失败
              </p>
              <p className="text-red-600 text-xs mt-1">
                请检查开发环境配置
              </p>
            </div>
            <button
              onClick={() => window.close()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              关闭窗口
            </button>
          </div>
        )}
      </div>
    </div>
  );
}