'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrowthTarget, SocialAccount, Wallet, AutoOrder } from '@/types';
import { BindAccountModal, CreateTargetModal, RechargeModal, CommentTemplatesModal } from '@/components/Modals';
import TwitterAccountManager from '@/components/TwitterAccountManager';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [growthTargets, setGrowthTargets] = useState<GrowthTarget[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 模态框状态
  const [showBindModal, setShowBindModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

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
      const [targetsRes, accountsRes, walletRes, ordersRes, analyticsRes] = await Promise.all([
        fetch(`/api/growth-targets?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/social-accounts?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/wallet?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/auto-orders?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/analytics/gap-analysis?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const targetsData = await targetsRes.json();
      const accountsData = await accountsRes.json();
      const walletData = await walletRes.json();
      const ordersData = await ordersRes.json();
      const analyticsDataResult = await analyticsRes.json();

      setGrowthTargets(targetsData.targets || []);
      setSocialAccounts(accountsData.accounts || []);
      setWallet(walletData.wallet);
      setTransactions(walletData.transactions || []);
      setAutoOrders(ordersData.orders || []);
      setAnalyticsData(analyticsDataResult);
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
      const response = await fetch(`/api/social-accounts?id=${accountId}&userId=${userId}`, {
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

  const createAutoOrder = async (targetId: string) => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) return;
    
    const userId = JSON.parse(userData).id;

    try {
      // 先分析差距
      const analysisResponse = await fetch('/api/analytics/gap-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, targetId }),
      });

      const analysisData = await analysisResponse.json();
      
      if (!analysisData.ok) {
        alert('分析失败: ' + analysisData.error);
        return;
      }

      const recommendation = analysisData.recommendation;
      
      if (recommendation.action !== 'PLACE_ORDER') {
        alert('当前不需要下单');
        return;
      }

      // 创建自动订单
      const target = growthTargets.find(t => t.id === targetId);
      const orderResponse = await fetch('/api/auto-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          targetId,
          accountId: target?.accountId,
          serviceType: target?.targetMetric,
          quantity: recommendation.suggestedPackage?.quantity || analysisData.gapAnalysis.difference,
          commentTemplates: target?.commentTemplates,
          packageId: recommendation.suggestedPackage?.id,
        }),
      });

      const orderData = await orderResponse.json();
      
      if (orderData.ok) {
        alert('自动订单创建成功！');
        fetchData();
      } else {
        alert('下单失败: ' + orderData.error);
      }
    } catch (error) {
      console.error('Create auto order error:', error);
      alert('自动下单失败');
    }
  };

  const analyzeTarget = async (targetId: string) => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) return;
    
    const userId = JSON.parse(userData).id;

    try {
      const response = await fetch('/api/analytics/gap-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, targetId }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const analysis = data.gapAnalysis;
        const recommendation = data.recommendation;
        
        let message = `数据分析结果：\n`;
        message += `当前值：${data.currentMetrics[data.targetId?.split('_')[1] || 'followers']}\n`;
        message += `目标值：${analysis.difference + data.currentMetrics[data.targetId?.split('_')[1] || 'followers']}\n`;
        message += `差距：${analysis.difference}\n`;
        message += `完成度：${(100 - analysis.percentageGap).toFixed(1)}%\n`;
        message += `建议操作：${recommendation.action === 'PLACE_ORDER' ? '自动下单' : '继续监控'}\n`;
        
        if (recommendation.estimatedCost > 0) {
          message += `预计费用：${recommendation.estimatedCost.toFixed(2)} USDT`;
        }
        
        alert(message);
      } else {
        alert('分析失败: ' + data.error);
      }
    } catch (error) {
      console.error('Analyze target error:', error);
      alert('分析失败');
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
            {/* Twitter账号管理 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Twitter 账号管理</h2>
                <span className="text-sm text-gray-500">基于Twint数据采集</span>
              </div>
              <div className="p-6">
                <TwitterAccountManager />
              </div>
            </div>

            {/* 传统社交账号绑定 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">其他社交账号</h2>
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

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">增长目标</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowCommentModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    评论管理
                  </button>
                  <button 
                    onClick={() => setShowTargetModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    创建目标
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {growthTargets.map(target => {
                    const percentage = target.targetValue > 0 ? (target.currentValue / target.targetValue) * 100 : 0;
                    const account = target.accountId ? socialAccounts.find(acc => acc.id === target.accountId) : null;
                    
                    return (
                      <div key={target.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {account ? `${account.username} - ${target.targetMetric}` : `通用目标 - ${target.targetMetric}`}
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
                              <>
                                <button
                                  onClick={() => analyzeTarget(target.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                  title="分析差距"
                                >
                                  分析
                                </button>
                                {target.autoOrderEnabled && (
                                  <button
                                    onClick={() => createAutoOrder(target.id)}
                                    className="text-purple-600 hover:text-purple-800 text-sm"
                                    title="自动下单"
                                  >
                                    下单
                                  </button>
                                )}
                                <button
                                  onClick={() => updateTargetStatus(target.id, 'paused')}
                                  className="text-yellow-600 hover:text-yellow-800 text-sm"
                                >
                                  暂停
                                </button>
                              </>
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
                          {target.autoOrderEnabled && ' | 自动下单已启用'}
                        </p>
                        {target.commentTemplates && target.commentTemplates.length > 0 && (
                          <p className="text-xs text-purple-600 mt-1">
                            已配置 {target.commentTemplates.length} 条评论模板
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {growthTargets.length === 0 && (
                    <p className="text-center text-gray-500 py-8">暂无增长目标</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 数据分析和自动订单 */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 数据分析 */}
            {analyticsData && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">数据分析概览</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{analyticsData.summary.totalTargets}</p>
                        <p className="text-sm text-gray-600">总目标数</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{analyticsData.summary.activeTargets}</p>
                        <p className="text-sm text-gray-600">活跃目标</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{analyticsData.summary.needsAction}</p>
                        <p className="text-sm text-gray-600">需要操作</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{analyticsData.summary.totalEstimatedCost.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">预计费用 (USDT)</p>
                      </div>
                    </div>

                    {analyticsData.targets.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">目标差距分析</h4>
                        <div className="space-y-2">
                          {analyticsData.targets.slice(0, 3).map((target: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium">{target.targetMetric}</p>
                                <p className="text-xs text-gray-600">
                                  {target.currentValue} / {target.targetValue}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${
                                  target.gapAnalysis.needsAction ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {target.gapAnalysis.percentageGap.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-600">
                                  差距: {target.gapAnalysis.difference}
                                </p>
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

            {/* 自动订单 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">自动订单</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {autoOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 capitalize">{order.serviceType}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'completed' ? '已完成' :
                           order.status === 'processing' ? '处理中' :
                           order.status === 'pending' ? '待处理' :
                           order.status === 'failed' ? '失败' : '已取消'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>数量:</span>
                          <span className="font-medium">{order.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>费用:</span>
                          <span className="font-medium">{order.totalAmount.toFixed(2)} USDT</span>
                        </div>
                        {order.serviceDetails && (
                          <div className="flex justify-between">
                            <span>预计时间:</span>
                            <span className="font-medium">{order.serviceDetails.estimatedTime}</span>
                          </div>
                        )}
                      </div>
                      {order.commentTemplates && order.commentTemplates.length > 0 && (
                        <p className="text-xs text-purple-600 mt-2">
                          评论模板: {order.commentTemplates.length} 条
                        </p>
                      )}
                    </div>
                  ))}
                  {autoOrders.length === 0 && (
                    <p className="text-center text-gray-500 py-8">暂无自动订单</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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

      <CommentTemplatesModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSuccess={fetchData}
        userId={userId}
      />
    </div>
  );
}