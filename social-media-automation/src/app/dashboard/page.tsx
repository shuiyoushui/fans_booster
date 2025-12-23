'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrowthTarget, SocialAccount, Wallet } from '@/types';
import { BindAccountModal, CreateTargetModal, RechargeModal } from '@/components/Modals';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [growthTargets, setGrowthTargets] = useState<GrowthTarget[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 模态框状态
  const [showBindModal, setShowBindModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth');
      return;
    }
    
    setUser(JSON.parse(userData));
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) return;
    
    const userId = JSON.parse(userData).id;

    try {
      const [targetsRes, accountsRes, walletRes] = await Promise.all([
        fetch(`/api/growth-targets?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/accounts?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/wallet?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const targetsData = await targetsRes.json();
      const accountsData = await accountsRes.json();
      const walletData = await walletRes.json();

      setGrowthTargets(targetsData.targets || []);
      setSocialAccounts(accountsData.accounts || []);
      setWallet(walletData.wallet);
      setTransactions(walletData.transactions || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const unbindAccount = async (accountId: string) => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) return;
    
    const userId = JSON.parse(userData).id;

    try {
      const response = await fetch(`/api/accounts?id=${accountId}&userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('解绑失败');
      }
    } catch (error) {
      console.error('Unbind error:', error);
      alert('解绑失败');
    }
  };

  const updateTargetStatus = async (targetId: string, status: string) => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) return;
    
    const userId = JSON.parse(userData).id;

    try {
      const response = await fetch('/api/growth-targets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: targetId,
          userId,
          status,
        }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Update target error:', error);
      alert('更新失败');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const userId = user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">社交媒体自动化平台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                欢迎, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 统计卡片 */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">钱包余额</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {wallet?.balance || 0} USDT
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">绑定账号</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">{socialAccounts.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">活跃目标</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {growthTargets.filter(target => target.status === 'active').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">已完成目标</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {growthTargets.filter(target => target.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 绑定账号 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">我的社交账号</h2>
                <button 
                  onClick={() => setShowBindModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  绑定新账号
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {socialAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{account.username}</h4>
                        <p className="text-sm text-gray-500">{account.platform.toUpperCase()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          account.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {account.isActive ? '活跃' : '非活跃'}
                        </span>
                        <button 
                          onClick={() => unbindAccount(account.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          解绑
                        </button>
                      </div>
                    </div>
                  ))}
                  {socialAccounts.length === 0 && (
                    <p className="text-center text-gray-500 py-8">暂无绑定账号</p>
                  )}
                </div>
              </div>
            </div>

            {/* 增长目标 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">增长目标</h2>
                <button 
                  onClick={() => setShowTargetModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  disabled={socialAccounts.length === 0}
                >
                  创建目标
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {growthTargets.map(target => {
                    const percentage = target.targetValue > 0 ? (target.currentValue / target.targetValue) * 100 : 0;
                    const account = socialAccounts.find(acc => acc.id === target.accountId);
                    
                    return (
                      <div key={target.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {account?.username} - {target.targetMetric}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              target.status === 'active' 
                                ? 'bg-blue-100 text-blue-800'
                                : target.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : target.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {target.status === 'active' ? '进行中' :
                               target.status === 'completed' ? '已完成' :
                               target.status === 'paused' ? '已暂停' : '已取消'}
                            </span>
                            {target.status === 'active' && (
                              <button
                                onClick={() => updateTargetStatus(target.id, 'paused')}
                                className="text-yellow-600 hover:text-yellow-800 text-sm"
                              >
                                暂停
                              </button>
                            )}
                            {target.status === 'paused' && (
                              <button
                                onClick={() => updateTargetStatus(target.id, 'active')}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                恢复
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>当前: {target.currentValue}</span>
                          <span>目标: {target.targetValue}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          完成度: {percentage.toFixed(1)}% | 截止: {new Date(target.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                  {growthTargets.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      {socialAccounts.length === 0 ? '请先绑定社交账号' : '暂无增长目标'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 钱包信息 */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">USDT钱包</h2>
              <button 
                onClick={() => setShowRechargeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                充值
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">钱包信息</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">余额:</span>
                      <span className="font-medium">{wallet?.balance || 0} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">钱包地址:</span>
                      <span className="font-mono text-sm">{wallet?.address || '未生成'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">货币类型:</span>
                      <span className="font-medium">{wallet?.currency || 'USDT'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">最近交易</h3>
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map(transaction => (
                      <div key={transaction.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount} USDT
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status === 'completed' ? '已完成' :
                             transaction.status === 'pending' ? '处理中' : '失败'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-center text-gray-500 py-4">暂无交易记录</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 模态框 */}
      <BindAccountModal
        isOpen={showBindModal}
        onClose={() => setShowBindModal(false)}
        onSuccess={fetchData}
        userId={userId}
      />
      
      <CreateTargetModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        onSuccess={fetchData}
        userId={userId}
        socialAccounts={socialAccounts}
      />
      
      <RechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={fetchData}
        userId={userId}
      />
    </div>
  );
}