'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface XAccountInfo {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  binding_status: 'pending' | 'active' | 'expired' | 'error';
  is_active: boolean;
  is_primary: boolean;
  last_sync_at?: string;
  auto_grow_enabled: boolean;
  created_at: string;
}

interface XAccountStats {
  total_accounts: number;
  active_accounts: number;
  primary_accounts: number;
  total_followers: number;
  total_following: number;
  total_tweets: number;
  accounts_by_status: Record<'pending' | 'active' | 'expired' | 'error', number>;
  accounts_growth_today: number;
  sync_success_rate: number;
  last_sync_time?: string;
}

export default function XAccountManager() {
  const [accounts, setAccounts] = useState<XAccountInfo[]>([]);
  const [stats, setStats] = useState<XAccountStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBinding, setIsBinding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAccounts();
    fetchStats();
  }, []);

  // 获取X账号列表
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

      const response = await fetch('/api/x/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAccounts(data.accounts);
        }
      } else if (response.status === 401) {
        toast.error('认证失败，请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('获取X账号列表失败:', error);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/x/accounts/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 开始X OAuth授权流程
  const startXOAuth = async () => {
    setIsBinding(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      // 1. 获取授权URL
      const urlResponse = await fetch('/api/x/auth/url', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!urlResponse.ok) {
        throw new Error('获取授权链接失败');
      }

      const urlData = await urlResponse.json();
      if (!urlData.success) {
        throw new Error(urlData.error || '生成授权链接失败');
      }

      // 2. 临时存储token供回调页面使用
      sessionStorage.setItem('temp_auth_token', token);

      // 3. 打开授权窗口
      const authWindow = window.open(
        urlData.auth_url,
        'x_oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('无法打开授权窗口，请检查浏览器弹窗设置');
      }

      // 4. 监听授权回调
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'X_OAUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          authWindow?.close();

          // 清理临时token
          sessionStorage.removeItem('temp_auth_token');

          // 刷新账号列表
          toast.success('X账号绑定成功！');
          fetchAccounts();
          fetchStats();
        } else if (event.data.type === 'X_OAUTH_ERROR') {
          window.removeEventListener('message', messageHandler);
          authWindow?.close();
          
          // 清理临时token
          sessionStorage.removeItem('temp_auth_token');
          
          const errorData = event.data.data;
          
          // 检查是否是过期state错误，如果是，提供自动重试
          if (errorData?.auto_retry_available) {
            toast.error('授权链接已过期，正在重新生成...', { duration: 2000 });
            
            // 自动重试
            setTimeout(() => {
              handleOAuthRetry(errorData);
            }, 2000);
          } else {
            toast.error(errorData?.error || '授权失败');
            setIsBinding(false);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // 监听窗口关闭
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          handleWindowClosed();
        }
      }, 1000);

    } catch (error) {
      console.error('X OAuth错误:', error);
      toast.error(error instanceof Error ? error.message : '授权失败');
      setIsBinding(false);
    }
  };

  // OAuth重试处理
  const handleOAuthRetry = async (errorData: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录');
        setIsBinding(false);
        return;
      }

      // 调用重试API
      const retryResponse = await fetch('/api/x/auth/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          expired_state: errorData.original_error?.includes('state') ? 'expired_state_detected' : null
        })
      });

      if (!retryResponse.ok) {
        throw new Error('重试请求失败');
      }

      const retryData = await retryResponse.json();
      if (!retryData.success) {
        throw new Error(retryData.error || '生成新授权链接失败');
      }

      // 使用新的授权URL重新开始流程
      toast.success('已生成新的授权链接，正在重新打开...');
      
      // 临时存储token供回调页面使用
      sessionStorage.setItem('temp_auth_token', token);

      // 打开新的授权窗口
      const authWindow = window.open(
        retryData.auth_url,
        'x_oauth_retry',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        throw new Error('无法打开授权窗口，请检查浏览器弹窗设置');
      }

      // 监听新的授权回调
      const retryMessageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'X_OAUTH_SUCCESS') {
          window.removeEventListener('message', retryMessageHandler);
          authWindow?.close();

          // 清理临时token
          sessionStorage.removeItem('temp_auth_token');

          // 刷新账号列表
          toast.success('X账号绑定成功！');
          fetchAccounts();
          fetchStats();
          setIsBinding(false);
        } else if (event.data.type === 'X_OAUTH_ERROR') {
          window.removeEventListener('message', retryMessageHandler);
          authWindow?.close();
          
          // 清理临时token
          sessionStorage.removeItem('temp_auth_token');
          
          const retryErrorData = event.data.data;
          if (retryErrorData?.auto_retry_available) {
            // 避免无限重试，最多重试一次
            toast.error('授权链接再次过期，请手动重试');
            setIsBinding(false);
          } else {
            toast.error(retryErrorData?.error || '授权失败');
            setIsBinding(false);
          }
        }
      };

      window.addEventListener('message', retryMessageHandler);

      // 监听窗口关闭
      const retryCheckClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(retryCheckClosed);
          window.removeEventListener('message', retryMessageHandler);
          setIsBinding(false);
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth重试错误:', error);
      toast.error(error instanceof Error ? error.message : '重试失败');
      setIsBinding(false);
    }
  };

  // 窗口关闭处理
  const handleWindowClosed = () => {
    setIsBinding(false);
    // 清理临时token
    sessionStorage.removeItem('temp_auth_token');
  };

  // 同步账号 - 使用新的X API
  const syncAccount = async (accountId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/x/accounts/${accountId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sync_types: ['profile', 'metrics'], // 使用X API替代Twint
          force_sync: false
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('数据同步已开始，正在通过X API获取最新数据...');
        // 轮询同步状态
        setTimeout(() => {
          fetchAccounts();
          fetchStats();
        }, 3000);
      } else {
        if (data.requires_reauth) {
          toast.error('授权已过期，请重新绑定账号');
        } else {
          toast.error(data.error || '同步失败');
        }
      }
    } catch (error) {
      console.error('同步账号失败:', error);
      toast.error('同步失败，请检查网络连接');
    }
  };

  // 删除账号
  const deleteAccount = async (accountId: string) => {
    if (!confirm('确定要删除这个X账号吗？此操作无法撤销。')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/x/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('账号已删除');
        fetchAccounts();
        fetchStats();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除账号失败:', error);
      toast.error('删除失败');
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mr-4 shadow-xl">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.067 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
              </svg>
            </div>
            X平台智能管理中心
          </h1>
          <p className="text-gray-300 text-lg">通过OAuth 2.0安全授权和AI驱动的API实时管理您的X平台账号</p>
          
          {/* 认证状态检查 */}
          {(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            if (!token || !user) {
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-6"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-300">
                      请先 <a href="/auth" className="text-blue-400 hover:text-blue-300 underline font-medium">登录</a> 后再使用此功能
                    </span>
                  </div>
                </motion.div>
              );
            }
            return null;
          })()}
        </motion.div>

      {/* 科技感统计卡片 */}
      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-br from-blue-600/20 to-indigo-800/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 shadow-xl hover:shadow-blue-500/25 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">总账号数</p>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold text-white"
                >
                  {stats.total_accounts}
                </motion.p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-1 bg-blue-500/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ delay: 0.6, duration: 1 }}
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-800/20 backdrop-blur-md border border-green-500/30 rounded-2xl p-6 shadow-xl hover:shadow-green-500/25 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-200">活跃账号</p>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-bold text-white"
                >
                  {stats.active_accounts}
                </motion.p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-1 bg-green-500/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.active_accounts / stats.total_accounts) * 100}%` }}
                transition={{ delay: 0.7, duration: 1 }}
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
              />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="bg-gradient-to-br from-purple-600/20 to-pink-800/20 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/25 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-200">同步成功率</p>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-3xl font-bold text-white"
                >
                  {stats.sync_success_rate.toFixed(1)}%
                </motion.p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-1 bg-purple-500/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.sync_success_rate}%` }}
                transition={{ delay: 0.8, duration: 1 }}
                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 添加账号按钮 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className="bg-gradient-to-br from-black/40 to-gray-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-10 shadow-xl hover:shadow-white/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center">
              <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.067 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
                </svg>
              </div>
              智能授权绑定
            </h2>
            <p className="text-gray-300">通过X平台OAuth 2.0安全授权和AI驱动的API实时获取运营数据，支持自动化管理</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startXOAuth}
            disabled={isBinding}
            className="bg-gradient-to-r from-black to-gray-800 text-white px-8 py-4 rounded-xl hover:from-gray-800 hover:to-black disabled:from-gray-600 disabled:to-gray-700 transition-all flex items-center space-x-3 shadow-xl font-medium"
          >
            {isBinding ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>授权中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.067 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
                </svg>
                <span>绑定X账号</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* 账号列表 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-indigo-600/20 to-purple-800/20 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            已绑定的账号
          </h2>
        </div>
        
        <div className="p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : accounts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">暂无绑定的X账号</h3>
              <p className="text-gray-400 mb-6">点击上方智能授权按钮绑定您的第一个X账号</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startXOAuth}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium"
              >
                立即绑定账号
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {accounts.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {account.avatar_url ? (
                        <img
                          src={account.avatar_url}
                          alt={account.display_name}
                          className="w-16 h-16 rounded-2xl mr-4 border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mr-4 flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {account.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center mb-2">
                          <h3 className="text-xl font-semibold text-white">{account.display_name}</h3>
                          {account.verified && (
                            <span className="ml-2 text-blue-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          {account.is_primary && (
                            <span className="ml-3 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-full font-medium">主账号</span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">@{account.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-4 py-2 text-sm font-medium rounded-xl ${
                        account.binding_status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        account.binding_status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        account.binding_status === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {account.binding_status === 'active' ? '活跃' :
                         account.binding_status === 'pending' ? '待同步' :
                         account.binding_status === 'error' ? '错误' : '过期'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center"
                    >
                      <p className="text-2xl font-bold text-blue-300">{formatNumber(account.followers_count)}</p>
                      <p className="text-xs text-gray-400 mt-1">粉丝</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 text-center"
                    >
                      <p className="text-2xl font-bold text-green-300">{formatNumber(account.following_count)}</p>
                      <p className="text-xs text-gray-400 mt-1">关注</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center"
                    >
                      <p className="text-2xl font-bold text-purple-300">{formatNumber(account.tweets_count)}</p>
                      <p className="text-xs text-gray-400 mt-1">推文</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-center"
                    >
                      <p className="text-sm font-medium text-orange-300">
                        {account.last_sync_at ? formatDate(account.last_sync_at) : '从未'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">最后同步</p>
                    </motion.div>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => syncAccount(account.id)}
                      className="px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl hover:bg-blue-600/30 transition-all flex items-center font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      同步数据(X API)
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => deleteAccount(account.id)}
                      className="px-6 py-3 bg-red-600/20 border border-red-500/30 text-red-300 rounded-xl hover:bg-red-600/30 transition-all flex items-center font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      解除绑定
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </div>
  );
}