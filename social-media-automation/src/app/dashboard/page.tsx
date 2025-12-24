'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GrowthTarget, Wallet, AutoOrder } from '@/types';
import { CreateTargetModal, RechargeModal, CommentTemplatesModal } from '@/components/Modals';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [growthTargets, setGrowthTargets] = useState<GrowthTarget[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 模态框状态
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
      const [targetsRes, walletRes, ordersRes, analyticsRes, xAccountsRes] = await Promise.all([
        fetch(`/api/growth-targets?userId=${userId}`, {
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
        fetch(`/api/x/accounts/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const targetsData = await targetsRes.json();
      const walletData = await walletRes.json();
      const ordersData = await ordersRes.json();
      const analyticsDataResult = await analyticsRes.json();
      const xAccountsData = await xAccountsRes.json();

      setGrowthTargets(targetsData.targets || []);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-white flex items-center"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-3"></div>
                智能增长平台
              </motion.h1>
            </div>
            <div className="flex items-center space-x-4">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-300"
              >
                欢迎, {user?.firstName} {user?.lastName}
              </motion.span>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={handleLogout}
                className="text-sm text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
              >
                退出登录
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* 科技感统计卡片 */}
        <div className="px-4 py-6 sm:px-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 shadow-xl hover:shadow-blue-500/25 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-200">钱包余额</h3>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-2 text-3xl font-bold text-white"
                  >
                    {wallet?.balance || 0}
                    <span className="text-lg font-normal text-blue-300 ml-1">USDT</span>
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 bg-blue-500/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ delay: 0.8, duration: 1 }}
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 shadow-xl hover:shadow-purple-500/25 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-purple-200">活跃目标</h3>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-2 text-3xl font-bold text-white"
                  >
                    {growthTargets.filter(target => target.status === 'active').length}
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 bg-purple-500/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ delay: 0.9, duration: 1 }}
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-md border border-green-500/30 rounded-2xl p-6 shadow-xl hover:shadow-green-500/25 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-green-200">已完成目标</h3>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-2 text-3xl font-bold text-white"
                  >
                    {growthTargets.filter(target => target.status === 'completed').length}
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
                  animate={{ width: '85%' }}
                  transition={{ delay: 1.0, duration: 1 }}
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-md border border-orange-500/30 rounded-2xl p-6 shadow-xl hover:shadow-orange-500/25 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-orange-200">进行中订单</h3>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-2 text-3xl font-bold text-white"
                  >
                    {autoOrders.filter(order => order.status === 'processing' || order.status === 'pending').length}
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 bg-orange-500/30 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '45%' }}
                  transition={{ delay: 1.1, duration: 1 }}
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* 增长目标模块 - 前置 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="px-4 py-6 sm:px-0"
        >
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-800/20 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                智能增长目标
              </h2>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCommentModal(true)}
                  className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-300 rounded-xl hover:bg-purple-600/30 transition-all text-sm font-medium"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  评论管理
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTargetModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-medium shadow-lg"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  创建目标
                </motion.button>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {growthTargets.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-2 text-center py-16"
                  >
                    <div className="w-24 h-24 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                      <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">开始您的增长之旅</h3>
                    <p className="text-gray-300 mb-6 max-w-md mx-auto">创建第一个增长目标，让AI智能分析数据并自动执行增长策略</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowTargetModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
                    >
                      立即创建目标
                    </motion.button>
                  </motion.div>
                ) : (
                  growthTargets.map((target, index) => {
                    const percentage = target.targetValue > 0 ? (target.currentValue / target.targetValue) * 100 : 0;
                    
                    return (
                      <motion.div
                        key={target.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-white text-lg">
                            {target.targetMetric === 'followers' ? '粉丝增长' : 
                             target.targetMetric === 'likes' ? '点赞增长' :
                             target.targetMetric === 'comments' ? '评论增长' : target.targetMetric}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              target.status === 'active' 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : target.status === 'completed'
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : target.status === 'paused'
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}>
                              {target.status === 'active' ? '进行中' :
                               target.status === 'completed' ? '已完成' :
                               target.status === 'paused' ? '已暂停' : '已取消'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-300 mb-4">
                          <div>
                            <span className="text-gray-400">当前: </span>
                            <span className="font-medium text-white">{target.currentValue}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">目标: </span>
                            <span className="font-medium text-white">{target.targetValue}</span>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>完成度</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(percentage, 100)}%` }}
                              transition={{ delay: 0.2 + 0.1 * index, duration: 1 }}
                              className={`h-3 rounded-full bg-gradient-to-r ${
                                percentage >= 80 ? 'from-green-400 to-green-600' :
                                percentage >= 50 ? 'from-blue-400 to-blue-600' :
                                'from-yellow-400 to-yellow-600'
                              }`}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                          <span>截止: {new Date(target.deadline).toLocaleDateString()}</span>
                          {target.autoOrderEnabled && (
                            <span className="text-purple-400">✓ 自动下单已启用</span>
                          )}
                        </div>

                        {target.commentTemplates && target.commentTemplates.length > 0 && (
                          <div className="mb-4 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <p className="text-xs text-purple-300">
                              已配置 {target.commentTemplates.length} 条智能评论模板
                            </p>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          {target.status === 'active' && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => analyzeTarget(target.id)}
                                className="flex-1 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                分析
                              </motion.button>
                              {target.autoOrderEnabled && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => createAutoOrder(target.id)}
                                  className="flex-1 px-3 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-all text-sm"
                                >
                                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  下单
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => updateTargetStatus(target.id, 'paused')}
                                className="px-3 py-2 bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-600/30 transition-all text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </motion.button>
                            </>
                          )}
                          {target.status === 'paused' && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateTargetStatus(target.id, 'active')}
                              className="w-full px-3 py-2 bg-green-600/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-600/30 transition-all text-sm"
                            >
                              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              恢复
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* X平台账号快速入口 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="px-4 py-6 sm:px-0"
        >
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-blue-600/20 to-cyan-800/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-8 shadow-xl hover:shadow-blue-500/25 transition-all"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.067 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">X平台智能管理</h3>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                通过官方OAuth 2.0安全授权，使用AI驱动的X平台API获取精准运营数据
              </p>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/x-accounts"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-black to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-black transition-all font-medium shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                管理X账号
              </motion.a>
            </div>
          </motion.div>
        </motion.div>

        {/* 数据分析和自动订单 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="px-4 py-6 sm:px-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 数据分析 */}
            {analyticsData && (
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-gradient-to-br from-cyan-600/20 to-blue-800/20 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-xl hover:shadow-cyan-500/25 transition-all overflow-hidden"
              >
                <div className="px-8 py-6 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    智能数据分析
                  </h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
                    >
                      <p className="text-2xl font-bold text-blue-300">{analyticsData.summary.totalTargets}</p>
                      <p className="text-sm text-gray-400">总目标数</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20"
                    >
                      <p className="text-2xl font-bold text-green-300">{analyticsData.summary.activeTargets}</p>
                      <p className="text-sm text-gray-400">活跃目标</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 }}
                      className="text-center p-4 bg-orange-500/10 rounded-xl border border-orange-500/20"
                    >
                      <p className="text-2xl font-bold text-orange-300">{analyticsData.summary.needsAction}</p>
                      <p className="text-sm text-gray-400">需要操作</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.0 }}
                      className="text-center p-4 bg-purple-500/10 rounded-xl border border-purple-500/20"
                    >
                      <p className="text-2xl font-bold text-purple-300">{analyticsData.summary.totalEstimatedCost.toFixed(2)}</p>
                      <p className="text-sm text-gray-400">预计费用 (USDT)</p>
                    </motion.div>
                  </div>

                  {analyticsData.targets.length > 0 && (
                    <div>
                      <h4 className="font-medium text-white mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        目标差距分析
                      </h4>
                      <div className="space-y-3">
                        {analyticsData.targets.slice(0, 3).map((target: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.1 + index * 0.1 }}
                            className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                          >
                            <div>
                              <p className="text-sm font-medium text-white">{target.targetMetric}</p>
                              <p className="text-xs text-gray-400">
                                {target.currentValue} / {target.targetValue}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                target.gapAnalysis.needsAction ? 'text-red-400' : 'text-green-400'
                              }`}>
                                {target.gapAnalysis.percentageGap.toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-400">
                                差距: {target.gapAnalysis.difference}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 自动订单 */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-orange-600/20 to-red-800/20 backdrop-blur-md border border-orange-500/30 rounded-2xl shadow-xl hover:shadow-orange-500/25 transition-all overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  自动订单执行
                </h2>
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  {autoOrders.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                        <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">暂无自动订单</h3>
                      <p className="text-gray-400 text-sm">创建增长目标后，系统将自动分析并生成订单</p>
                    </motion.div>
                  ) : (
                    autoOrders.slice(0, 5).map((order, index) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-white capitalize">{order.serviceType}</h4>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            order.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                            order.status === 'processing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                            order.status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          }`}>
                            {order.status === 'completed' ? '已完成' :
                             order.status === 'processing' ? '处理中' :
                             order.status === 'pending' ? '待处理' :
                             order.status === 'failed' ? '失败' : '已取消'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-300 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">数量:</span>
                            <span className="font-medium text-white">{order.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">费用:</span>
                            <span className="font-medium text-white">{order.totalAmount.toFixed(2)} USDT</span>
                          </div>
                          {order.serviceDetails && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">预计时间:</span>
                              <span className="font-medium text-white">{order.serviceDetails.estimatedTime}</span>
                            </div>
                          )}
                        </div>
                        {order.commentTemplates && order.commentTemplates.length > 0 && (
                          <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <p className="text-xs text-purple-300">
                              评论模板: {order.commentTemplates.length} 条
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
        {/* 钱包管理 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="px-4 py-6 sm:px-0"
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-800/20 backdrop-blur-md border border-green-500/30 rounded-2xl shadow-xl hover:shadow-green-500/25 transition-all overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                智能钱包管理
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowRechargeModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all text-sm font-medium"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                充值
              </motion.button>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    钱包信息
                  </h3>
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                      className="flex justify-between items-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                    >
                      <span className="text-gray-300">余额</span>
                      <span className="font-bold text-xl text-white">{wallet?.balance || 0} USDT</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0 }}
                      className="flex justify-between items-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                    >
                      <span className="text-gray-300">钱包地址</span>
                      <span className="font-mono text-sm text-white">{wallet?.address || '未生成'}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 }}
                      className="flex justify-between items-center p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
                    >
                      <span className="text-gray-300">货币类型</span>
                      <span className="font-medium text-white">{wallet?.currency || 'USDT'}</span>
                    </motion.div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    最近交易
                  </h3>
                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                      >
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-green-500/20">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-gray-400 text-sm">暂无交易记录</p>
                      </motion.div>
                    ) : (
                      transactions.slice(0, 5).map((transaction, index) => (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{transaction.description}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${
                              transaction.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount} USDT
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {transaction.status === 'completed' ? '已完成' :
                               transaction.status === 'pending' ? '处理中' : '失败'}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* 模态框 */}
      <CreateTargetModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        onSuccess={fetchData}
        userId={userId}
        socialAccounts={[]}
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