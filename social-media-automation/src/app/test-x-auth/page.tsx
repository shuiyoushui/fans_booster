'use client';

import { useState, useEffect } from 'react';

export default function TestXAuth() {
  const [isOpening, setIsOpening] = useState(false);
  const [useRealX, setUseRealX] = useState(false);
  const [hasRealConfig, setHasRealConfig] = useState(false);

  useEffect(() => {
    // 检查是否有真实的X配置
    checkRealConfig();
  }, []);

  const checkRealConfig = async () => {
    try {
      const response = await fetch('/api/x/config/check');
      const data = await response.json();
      setHasRealConfig(data.has_real_config);
    } catch (error) {
      console.error('Failed to check config:', error);
      setHasRealConfig(false);
    }
  };

  const openAuth = async () => {
    setIsOpening(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('请先登录');
        setIsOpening(false);
        return;
      }

      // 选择API端点
      const endpoint = useRealX ? '/api/x/auth/url/real' : '/api/x/auth/url';
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取授权链接失败');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '生成授权链接失败');
      }

      console.log('Opening auth URL:', data.auth_url);
      console.log('Auth mode:', useRealX ? 'Real X' : 'Mock');
      
      // 打开授权窗口
      const authWindow = window.open(
        data.auth_url,
        'x_oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('无法打开授权窗口，请检查浏览器弹窗设置');
      }
      
      setTimeout(() => {
        setIsOpening(false);
      }, 1000);

    } catch (error) {
      console.error('Auth error:', error);
      alert(error instanceof Error ? error.message : '授权失败');
      setIsOpening(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">X平台授权测试</h1>
        
        {/* 授权模式选择 */}
        <div className="mb-6">
          <label className="text-sm text-gray-300 mb-3 block">选择授权模式：</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setUseRealX(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                !useRealX 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              🧪 模拟授权
            </button>
            <button
              onClick={() => setUseRealX(true)}
              disabled={!hasRealConfig}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                useRealX 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : hasRealConfig
                    ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    : 'bg-white/5 text-gray-600 border border-gray-600 cursor-not-allowed'
              }`}
            >
              🔐 真实X授权
            </button>
          </div>
          
          {!hasRealConfig && (
            <p className="text-xs text-yellow-400">
              ⚠️ 真实X授权需要配置开发者凭据
            </p>
          )}
        </div>
        
        <p className="text-gray-300 mb-6">
          {useRealX 
            ? "将跳转到X平台官方授权页面进行真实授权" 
            : "开发环境模拟授权，用于测试功能流程"
          }
        </p>
        
        <button
          onClick={openAuth}
          disabled={isOpening}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isOpening ? '正在打开授权页面...' : 
           useRealX ? '跳转到X平台授权' : '测试模拟授权'}
        </button>
        
        <div className="mt-6 space-y-2 text-sm text-gray-400">
          <p>
            {useRealX ? (
              <>
                🔐 将跳转到twitter.com官方授权页面<br/>
                📝 需要登录你的X账号并授权<br/>
                ✅ 授权后将自动返回并绑定账号
              </>
            ) : (
              <>
                🔧 这是开发环境的模拟测试<br/>
                📝 授权页面会在新窗口打开<br/>
                ✅ 处理完成后会自动关闭
              </>
            )}
          </p>
        </div>
        
        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">调试信息：</p>
          <p className="text-xs text-gray-500">打开浏览器控制台查看详细日志</p>
          <p className="text-xs text-gray-500 mt-1">配置状态: {hasRealConfig ? '✅ 已配置' : '❌ 未配置'}</p>
        </div>
      </div>
    </div>
  );
}