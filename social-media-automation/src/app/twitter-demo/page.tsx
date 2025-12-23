"use client";

import React, { useState, useEffect } from 'react';
import TwitterAccountManager from '@/components/TwitterAccountManager';

export default function TwitterDemoPage() {
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    // 延迟显示演示内容，让页面有更好的加载体验
    const timer = setTimeout(() => setShowDemo(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Twitter数据采集演示</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/dashboard" 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                返回仪表板
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4">
        {/* 演示说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">🚀 Twitter数据采集演示</h2>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>输入用户名</strong>：输入任意Twitter用户名（如：elonmusk, nasa等）</p>
            <p>• <strong>自动采集</strong>：系统将自动获取用户基本信息和推文数据</p>
            <p>• <strong>实时监控</strong>：可查看采集进度和状态</p>
            <p>• <strong>数据存储</strong>：采集的数据会保存在本地数据库中</p>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded text-blue-900 text-sm">
            💡 <strong>提示</strong>：这是基于模拟数据的演示，实际部署时可接入真实的Twitter数据采集服务
          </div>
        </div>

        {/* Twitter账号管理组件 */}
        {showDemo && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">账号管理界面</h3>
              <p className="text-sm text-gray-500 mt-1">添加和管理Twitter账号，查看数据分析结果</p>
            </div>
            <TwitterAccountManager />
          </div>
        )}

        {/* API状态检查 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🔗 服务状态</h3>
            <div className="space-y-3">
              <ServiceStatusCheck 
                name="Python数据采集服务" 
                url="http://localhost:8000" 
                description="负责数据采集和处理的Python FastAPI服务"
              />
              <ServiceStatusCheck 
                name="Next.js前端服务" 
                url="/api/twitter/tasks" 
                description="负责用户界面和API路由的前端服务"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 快速统计</h3>
            <QuickStats />
          </div>
        </div>
      </main>
    </div>
  );
}

function ServiceStatusCheck({ name, url, description }: { 
  name: string; 
  url: string; 
  description: string;
}) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          setStatus('online');
          const data = await response.json();
          setDetails(JSON.stringify(data).substring(0, 100) + '...');
        } else {
          setStatus('offline');
          setDetails(`HTTP ${response.status}`);
        }
      } catch (error) {
        setStatus('offline');
        setDetails('连接失败');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // 每30秒检查一次
    return () => clearInterval(interval);
  }, [url]);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{name}</h4>
        <div className={`flex items-center ${status === 'online' ? 'text-green-600' : status === 'offline' ? 'text-red-600' : 'text-yellow-600'}`}>
          {status === 'checking' && (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-2"></div>
              检查中...
            </>
          )}
          {status === 'online' && (
            <>
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
              在线
            </>
          )}
          {status === 'offline' && (
            <>
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              离线
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{description}</p>
      {details && (
        <p className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded">
          {details}
        </p>
      )}
    </div>
  );
}

function QuickStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/twitter/tasks');
        const data = await response.json();
        if (data.success) {
          setStats({
            totalTasks: data.tasks.length,
            completedTasks: data.tasks.filter((t: any) => t.status === 'completed').length,
            pendingTasks: data.tasks.filter((t: any) => t.status === 'pending').length,
            failedTasks: data.tasks.filter((t: any) => t.status === 'failed').length,
          });
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 每10秒刷新一次
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="animate-pulse h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-sm text-gray-500">
        无法获取统计数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">总任务数</span>
        <span className="text-lg font-bold text-gray-900">{stats.totalTasks}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex justify-between items-center p-2 bg-green-50 rounded">
          <span className="text-xs text-green-700">已完成</span>
          <span className="text-sm font-bold text-green-900">{stats.completedTasks}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
          <span className="text-xs text-yellow-700">处理中</span>
          <span className="text-sm font-bold text-yellow-900">{stats.pendingTasks}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-red-50 rounded">
          <span className="text-xs text-red-700">失败</span>
          <span className="text-sm font-bold text-red-900">{stats.failedTasks}</span>
        </div>
        
        <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
          <span className="text-xs text-blue-700">成功率</span>
          <span className="text-sm font-bold text-blue-900">
            {stats.totalTasks > 0 
              ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}