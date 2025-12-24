'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BudgetTestPage() {
  const [targets, setTargets] = useState([
    {
      id: '1',
      serviceType: 'followers',
      currentQuantity: 1000,
      targetQuantity: 5000,
      quality: 'standard'
    },
    {
      id: '2', 
      serviceType: 'likes',
      currentQuantity: 500,
      targetQuantity: 2000,
      quality: 'premium'
    },
    {
      id: '3',
      serviceType: 'comments',
      currentQuantity: 50,
      targetQuantity: 200,
      quality: 'standard'
    }
  ]);
  
  const [currentBalance, setCurrentBalance] = useState(100);
  const [budgetAnalysis, setBudgetAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [priceList, setPriceList] = useState<any>(null);

  useEffect(() => {
    fetchPriceList();
  }, []);

  const fetchPriceList = async () => {
    try {
      const response = await fetch('/api/budget/calculate');
      const data = await response.json();
      setPriceList(data.allServices);
    } catch (error) {
      console.error('Failed to fetch price list:', error);
    }
  };

  const calculateBudget = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/budget/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          targets,
          currentBalance,
          preferredQuality: 'standard'
        }),
      });

      const data = await response.json();
      setBudgetAnalysis(data.budgetAnalysis);
    } catch (error) {
      console.error('Failed to calculate budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTarget = () => {
    const newTarget = {
      id: Date.now().toString(),
      serviceType: 'followers',
      currentQuantity: 0,
      targetQuantity: 1000,
      quality: 'standard'
    };
    setTargets([...targets, newTarget]);
  };

  const updateTarget = (id: string, field: string, value: any) => {
    setTargets(targets.map(target => 
      target.id === id ? { ...target, [field]: value } : target
    ));
  };

  const removeTarget = (id: string) => {
    setTargets(targets.filter(target => target.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white mb-8 text-center"
        >
          💰 预算计算测试工具
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 输入区域 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* 余额设置 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">当前余额</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(Number(e.target.value))}
                  className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400"
                  placeholder="输入余额金额"
                />
                <span className="text-white font-medium">USDT</span>
              </div>
            </div>

            {/* 目标列表 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">增长目标</h3>
                <button
                  onClick={addTarget}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 添加目标
                </button>
              </div>

              <div className="space-y-4">
                {targets.map((target, index) => (
                  <motion.div
                    key={target.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">服务类型</label>
                        <select
                          value={target.serviceType}
                          onChange={(e) => updateTarget(target.id, 'serviceType', e.target.value)}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                        >
                          <option value="followers">粉丝</option>
                          <option value="likes">点赞</option>
                          <option value="comments">评论</option>
                          <option value="views">观看</option>
                          <option value="shares">分享</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">质量等级</label>
                        <select
                          value={target.quality}
                          onChange={(e) => updateTarget(target.id, 'quality', e.target.value)}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                        >
                          <option value="standard">标准</option>
                          <option value="premium">高级</option>
                          <option value="targeted">定向</option>
                          <option value="instant">即时</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">当前数量</label>
                        <input
                          type="number"
                          value={target.currentQuantity}
                          onChange={(e) => updateTarget(target.id, 'currentQuantity', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-300 block mb-1">目标数量</label>
                        <input
                          type="number"
                          value={target.targetQuantity}
                          onChange={(e) => updateTarget(target.id, 'targetQuantity', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">
                        差距: <span className="text-white font-medium">
                          {Math.max(0, target.targetQuantity - target.currentQuantity)}
                        </span>
                      </span>
                      <button
                        onClick={() => removeTarget(target.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 计算按钮 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={calculateBudget}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? '计算中...' : '🧮 计算预算需求'}
            </motion.button>
          </motion.div>

          {/* 结果区域 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* 预算分析结果 */}
            {budgetAnalysis && (
              <>
                {/* 总览 */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4">预算总览</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-gray-300">总需求</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {budgetAnalysis.summary.totalRequired.toFixed(2)} USDT
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-gray-300">预算缺口</p>
                      <p className={`text-2xl font-bold ${budgetAnalysis.summary.budgetGap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {budgetAnalysis.summary.budgetGap.toFixed(2)} USDT
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-gray-300">可完成目标</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {budgetAnalysis.summary.affordableTargets}/{budgetAnalysis.summary.totalTargets}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-gray-300">剩余余额</p>
                      <p className="text-2xl font-bold text-green-400">
                        {budgetAnalysis.summary.remainingBalance.toFixed(2)} USDT
                      </p>
                    </div>
                  </div>
                </div>

                {/* 目标详情 */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold text-white mb-4">目标详情</h3>
                  <div className="space-y-3">
                    {budgetAnalysis.targets.map((target: any, index: number) => (
                      <div
                        key={target.targetId}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-white font-medium capitalize">
                              {target.serviceType} - {target.quality}
                            </h4>
                            <p className="text-sm text-gray-300">
                              {target.currentQuantity} → {target.targetQuantity}
                              (差距: {target.gap})
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            target.canAfford 
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {target.canAfford ? '可完成' : '余额不足'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-300">
                            单价: {target.budget.unitPrice.toFixed(4)} USDT
                          </p>
                          <p className="text-sm font-medium text-white">
                            总费用: {target.budget.required.toFixed(2)} USDT
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 推荐建议 */}
                {budgetAnalysis.summary.recommendations.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">💡 智能建议</h3>
                    <div className="space-y-2">
                      {budgetAnalysis.summary.recommendations.map((rec: string, index: number) => (
                        <div
                          key={index}
                          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
                        >
                          <p className="text-blue-300 text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 价格列表 */}
            {priceList && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">📊 价格参考</h3>
                <div className="space-y-3">
                  {Object.entries(priceList).map(([service, prices]: [string, any]) => (
                    <div key={service} className="bg-white/5 rounded-lg p-3">
                      <h4 className="text-white font-medium capitalize mb-2">{service}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(prices as any).map(([quality, info]: [string, any]) => (
                          <div key={quality} className="flex justify-between text-sm">
                            <span className="text-gray-300 capitalize">{quality}:</span>
                            <span className="text-white">
                              ${info.rate.toFixed(4)}/个 ({info.time})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}