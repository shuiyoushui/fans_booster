'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">X平台账号管理</h1>
        <p className="text-gray-600">通过OAuth 2.0安全授权管理您的X平台账号</p>
        
        {/* 认证状态检查 */}
        {(() => {
          const token = localStorage.getItem('token');
          const user = localStorage.getItem('user');
          if (!token || !user) {
            return (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-800">
                    请先 <a href="/auth" className="text-blue-600 hover:underline">登录</a> 后再使用此功能
                  </span>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总账号数</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_accounts}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃账号</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active_accounts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总粉丝数</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.total_followers)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">同步成功率</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.sync_success_rate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加账号按钮 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">绑定新账号</h2>
            <p className="text-gray-600">通过X平台OAuth 2.0安全授权绑定您的账号，使用官方API获取运营数据</p>
          </div>
          <button
            onClick={startXOAuth}
            disabled={isBinding}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
          >
            {isBinding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
          </button>
        </div>
      </div>

      {/* 账号列表 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">已绑定的账号</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无绑定的X账号</h3>
            <p className="text-gray-500 mb-4">点击上方按钮绑定您的第一个X账号</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    {account.avatar_url && (
                      <img
                        src={account.avatar_url}
                        alt={account.display_name}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                    )}
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-semibold">{account.display_name}</h3>
                        {account.verified && (
                          <span className="ml-1 text-blue-500">✓</span>
                        )}
                        {account.is_primary && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">主账号</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">@{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      account.binding_status === 'active' ? 'bg-green-100 text-green-800' :
                      account.binding_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      account.binding_status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {account.binding_status === 'active' ? '活跃' :
                       account.binding_status === 'pending' ? '待同步' :
                       account.binding_status === 'error' ? '错误' : '过期'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">粉丝:</span>
                    <span className="font-medium">{formatNumber(account.followers_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">关注:</span>
                    <span className="font-medium">{formatNumber(account.following_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">推文:</span>
                    <span className="font-medium">{formatNumber(account.tweets_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最后同步:</span>
                    <span className="font-medium">
                      {account.last_sync_at ? formatDate(account.last_sync_at) : '从未'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => syncAccount(account.id)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    同步数据(X API)
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    解除绑定
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}