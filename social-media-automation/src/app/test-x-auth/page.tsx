'use client';

import { useState } from 'react';

export default function TestXAuth() {
  const [isOpening, setIsOpening] = useState(false);

  const openMockAuth = () => {
    setIsOpening(true);
    
    // 生成测试状态和代码
    const state = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const code = `mock_code_${Date.now()}`;
    
    const authUrl = `/auth/x/mock-callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`;
    
    console.log('Opening auth URL:', authUrl);
    
    // 在当前窗口打开（用于测试）
    window.open(authUrl, '_blank', 'width=500,height=600');
    
    setTimeout(() => {
      setIsOpening(false);
    }, 1000);
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
        
        <p className="text-gray-300 mb-6">
          点击下面的按钮测试X平台模拟授权流程
        </p>
        
        <button
          onClick={openMockAuth}
          disabled={isOpening}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isOpening ? '正在打开授权页面...' : '测试模拟授权'}
        </button>
        
        <div className="mt-6 space-y-2 text-sm text-gray-400">
          <p>🔧 这是开发环境的模拟测试</p>
          <p>📝 授权页面会在新窗口打开</p>
          <p>✅ 处理完成后会自动关闭</p>
        </div>
        
        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">调试信息：</p>
          <p className="text-xs text-gray-500">打开浏览器控制台查看详细日志</p>
        </div>
      </div>
    </div>
  );
}