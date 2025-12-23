"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface TwitterUser {
  username: string;
  user_id?: string;
  name?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  likes_count: number;
  profile_image_url?: string;
  verified: boolean;
  created_at?: string;
  location?: string;
  website?: string;
}

interface TweetData {
  id: string;
  conversation_id: string;
  created_at: string;
  date: string;
  time: string;
  timezone: string;
  user_id: string;
  username: string;
  name: string;
  tweet: string;
  replies_count: number;
  likes_count: number;
  retweets_count: number;
  views_count: number;
  hashtags: string[];
  mentions: string[];
  link: string;
}

interface AnalysisTask {
  task_id: string;
  username: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export default function TwitterAccountManager() {
  const [username, setUsername] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentTask, setCurrentTask] = useState<AnalysisTask | null>(null);
  const [userAccounts, setUserAccounts] = useState<TwitterUser[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TwitterUser | null>(null);
  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [showTweetModal, setShowTweetModal] = useState(false);
  const [includeTweets, setIncludeTweets] = useState(true);
  const [tweetsLimit, setTweetsLimit] = useState(50);

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping fetchTasks');
        return;
      }
      
      const response = await fetch('/api/twitter/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      } else if (response.status === 401) {
        // Token过期，清除本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    }
  };

  // 开始分析
  const startAnalysis = async () => {
    if (!username.trim()) {
      toast.error('请输入Twitter用户名');
      return;
    }

    // 检查认证状态
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      toast.error('请先登录后再使用此功能');
      return;
    }

    if (!user) {
      toast.error('用户信息已过期，请重新登录');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/twitter/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username.trim().replace('@', ''),
          include_tweets: includeTweets,
          tweets_limit: tweetsLimit,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`分析任务已创建，任务ID: ${data.analysis_id}`);
        setCurrentTask({
          task_id: data.analysis_id,
          username: username.trim().replace('@', ''),
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        
        // 开始轮询任务状态
        pollTaskStatus(data.analysis_id);
      } else {
        if (response.status === 401) {
          toast.error('认证失败，请重新登录');
          // 清除过期的认证信息
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // 重定向到登录页面
          window.location.href = '/auth';
        } else {
          toast.error(data.message || '创建分析任务失败');
        }
      }
    } catch (error) {
      console.error('分析请求失败:', error);
      toast.error('分析请求失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const token = localStorage.getItem('token');
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/twitter/result/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();

        if (data.status === 'completed') {
          toast.success('数据分析完成！');
          setCurrentTask(null);
          fetchTasks(); // 刷新任务列表
          
          // 更新用户账号列表
          if (data.user_data) {
            const user = data.user_data;
            if (!userAccounts.find(acc => acc.username === user.username)) {
              setUserAccounts(prev => [...prev, user]);
            }
          }
        } else if (data.status === 'failed') {
          toast.error(`分析失败: ${data.task_status?.error_message || '未知错误'}`);
          setCurrentTask(null);
          fetchTasks();
        } else {
          // 继续轮询
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
        setTimeout(poll, 3000);
      }
    };

    poll();
  };

  // 查看用户详情
  const viewUserDetails = async (user: TwitterUser) => {
    setSelectedAccount(user);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('请先登录后再使用此功能');
        return;
      }
      
      const response = await fetch(`/api/twitter/user/${user.username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const updatedUser = { ...user, ...data.data };
        setSelectedAccount(updatedUser);
        
        // 获取推文数据
        if (includeTweets) {
          // 这里可以调用获取推文的API
          setTweets([]); // 暂时为空
        }
      } else if (response.status === 401) {
        toast.error('认证失败，请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('获取用户详情失败:', error);
      toast.error('获取用户详情失败');
    }
  };

  // 删除账号
  const deleteAccount = (username: string) => {
    setUserAccounts(prev => prev.filter(acc => acc.username !== username));
    if (selectedAccount?.username === username) {
      setSelectedAccount(null);
      setTweets([]);
    }
    toast.success('账号已删除');
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

  useEffect(() => {
    fetchTasks();
  }, []);

  // 检查认证状态
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      // 如果未认证，显示提示信息
      const timer = setTimeout(() => {
        toast.error('请先登录以使用Twitter账号管理功能', {
          duration: 5000,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Twitter账号管理</h1>
        <p className="text-gray-600">添加和管理Twitter账号，获取数据分析和洞察</p>
        
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

      {/* 添加账号表单 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">添加新账号</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twitter用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入Twitter用户名（如：elonmusk）"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeTweets}
                onChange={(e) => setIncludeTweets(e.target.checked)}
                className="mr-2"
              />
              包含推文数据
            </label>
            
            {includeTweets && (
              <div className="flex items-center space-x-2">
                <label>推文数量:</label>
                <select
                  value={tweetsLimit}
                  onChange={(e) => setTweetsLimit(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded"
                >
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                  <option value={100}>100条</option>
                  <option value={200}>200条</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing || !username.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isAnalyzing ? '分析中...' : '开始分析'}
          </button>
        </div>

        {/* 当前任务状态 */}
        {currentTask && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  正在分析 @{currentTask.username}
                </p>
                <p className="text-xs text-blue-700">
                  任务状态: {currentTask.status === 'pending' ? '等待中' : '处理中'}
                </p>
              </div>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}
      </div>

      {/* 账号列表 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">已添加的账号</h2>
        
        {userAccounts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无账号，请添加Twitter账号</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userAccounts.map((user) => (
              <div key={user.username} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {user.profile_image_url && (
                      <img
                        src={user.profile_image_url}
                        alt={user.name || user.username}
                        className="w-12 h-12 rounded-full mr-3"
                      />
                    )}
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-semibold">{user.name || user.username}</h3>
                        {user.verified && (
                          <span className="ml-1 text-blue-500">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAccount(user.username)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">粉丝:</span>
                    <span className="font-medium">{formatNumber(user.followers_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">关注:</span>
                    <span className="font-medium">{formatNumber(user.following_count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">推文:</span>
                    <span className="font-medium">{formatNumber(user.tweets_count)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => viewUserDetails(user)}
                  className="mt-3 w-full bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-colors"
                >
                  查看详情
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 用户详情模态框 */}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  {selectedAccount.profile_image_url && (
                    <img
                      src={selectedAccount.profile_image_url}
                      alt={selectedAccount.name || selectedAccount.username}
                      className="w-16 h-16 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <div className="flex items-center">
                      <h2 className="text-2xl font-bold">{selectedAccount.name || selectedAccount.username}</h2>
                      {selectedAccount.verified && (
                        <span className="ml-2 text-blue-500">✓</span>
                      )}
                    </div>
                    <p className="text-gray-600">@{selectedAccount.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {selectedAccount.bio && (
                <p className="text-gray-700 mb-4">{selectedAccount.bio}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(selectedAccount.followers_count)}</div>
                  <div className="text-gray-600">粉丝</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(selectedAccount.following_count)}</div>
                  <div className="text-gray-600">关注</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(selectedAccount.tweets_count)}</div>
                  <div className="text-gray-600">推文</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatNumber(selectedAccount.likes_count)}</div>
                  <div className="text-gray-600">点赞</div>
                </div>
              </div>

              {selectedAccount.location && (
                <div className="mb-2">
                  <span className="font-medium">位置:</span> {selectedAccount.location}
                </div>
              )}

              {selectedAccount.website && (
                <div className="mb-2">
                  <span className="font-medium">网站:</span>{' '}
                  <a href={selectedAccount.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {selectedAccount.website}
                  </a>
                </div>
              )}

              {selectedAccount.created_at && (
                <div className="mb-4">
                  <span className="font-medium">注册时间:</span> {formatDate(selectedAccount.created_at)}
                </div>
              )}

              {tweets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">最近推文</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tweets.map((tweet) => (
                      <div key={tweet.id} className="border border-gray-200 rounded-lg p-3">
                        <p className="text-gray-800 mb-2">{tweet.tweet}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{formatDate(tweet.created_at)}</span>
                          <div className="flex items-center space-x-4">
                            <span>💬 {tweet.replies_count}</span>
                            <span>🔄 {tweet.retweets_count}</span>
                            <span>❤️ {tweet.likes_count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}