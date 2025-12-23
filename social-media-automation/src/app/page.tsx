'use client';

import { useState, useEffect } from 'react';
import { SocialAccount, MonitoringTarget, AutoOrder, ServicePackage } from '@/types';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [targets, setTargets] = useState<MonitoringTarget[]>([]);
  const [orders, setOrders] = useState<AutoOrder[]>([]);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, targetsRes, ordersRes, servicesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/monitoring'),
        fetch('/api/orders'),
        fetch('/api/services'),
      ]);

      const accountsData = await accountsRes.json();
      const targetsData = await targetsRes.json();
      const ordersData = await ordersRes.json();
      const servicesData = await servicesRes.json();

      setAccounts(accountsData.accounts || []);
      setTargets(targetsData.targets || []);
      setOrders(ordersData.orders || []);
      setServices(servicesData.services || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            社交媒体自动化平台
          </h1>
          <p className="mt-2 text-gray-600">
            监控账号数据，自动匹配服务，智能下单
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">活跃账号</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {accounts.filter(acc => acc.isActive).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">监控目标</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{targets.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">待处理订单</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {orders.filter(order => order.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">可用服务</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {services.filter(service => service.isActive).length}
            </p>
          </div>
        </div>

        {/* 账号管理 */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">账号管理</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {accounts.map(account => (
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
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无账号</p>
              )}
            </div>
          </div>
        </div>

        {/* 监控目标 */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">监控目标</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {targets.map(target => {
                const percentage = (target.currentValue / target.targetValue) * 100;
                return (
                  <div key={target.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{target.metric}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        target.autoOrderEnabled 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {target.autoOrderEnabled ? '自动下单' : '手动'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>当前: {target.currentValue}</span>
                      <span>目标: {target.targetValue}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      完成度: {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
              {targets.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无监控目标</p>
              )}
            </div>
          </div>
        </div>

        {/* 订单状态 */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">订单状态</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">订单 #{order.id}</h4>
                    <p className="text-sm text-gray-500">
                      ${order.orderAmount} - {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'completed' ? '已完成' :
                       order.status === 'processing' ? '处理中' :
                       order.status === 'failed' ? '失败' : '待处理'}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无订单</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}