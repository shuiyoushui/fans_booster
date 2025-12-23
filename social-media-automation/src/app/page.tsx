'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-bold text-xl">SocialAuto</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">功能</a>
              <a href="#stats" className="text-gray-300 hover:text-white transition-colors">数据</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">定价</a>
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                {isLoggedIn ? '进入控制台' : '开始使用'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                社交媒体自动化
              </span>
              <br />
              <span className="text-3xl md:text-5xl text-gray-300">智能运营平台</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              通过AI驱动的数据分析、智能粉丝增长和自动化运营工具，让你的社交媒体账号实现指数级增长
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-90 transition-all transform hover:scale-105"
              >
                {isLoggedIn ? '进入控制台' : '免费开始'}
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="border border-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all"
              >
                了解更多
              </button>
            </div>
          </motion.div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-75"></div>
          <div className="absolute bottom-10 left-1/4 w-24 h-24 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-150"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: '活跃用户', value: '10K+', icon: '👥' },
              { label: '管理账号', value: '50K+', icon: '📱' },
              { label: '日增长率', value: '15%', icon: '📈' },
              { label: '服务满意度', value: '98%', icon: '⭐' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 text-center"
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">强大功能</h2>
            <p className="text-xl text-gray-300">一站式解决你的社交媒体运营需求</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: '数据监控',
                description: '实时监控账号运营数据，智能分析增长趋势',
                icon: '📊',
                features: ['实时数据追踪', '智能分析报告', '趋势预测']
              },
              {
                title: '智能加粉',
                description: '基于AI算法的精准粉丝增长策略',
                icon: '🤖',
                features: ['目标用户分析', '自动化关注', '精准推荐']
              },
              {
                title: '自动下单',
                description: '根据数据分析结果，自动下单推广服务',
                icon: '💎',
                features: ['智能匹配服务', '自动充值', '订单管理']
              },
              {
                title: '多平台支持',
                description: '支持主流社交媒体平台统一管理',
                icon: '🌐',
                features: ['X(Twitter)', 'Instagram', 'TikTok', 'YouTube']
              },
              {
                title: '安全保障',
                description: '企业级安全防护，保护账号数据安全',
                icon: '🔒',
                features: ['数据加密', '隐私保护', '安全备份']
              },
              {
                title: '24/7支持',
                description: '专业技术团队全天候在线支持',
                icon: '🎯',
                features: ['在线客服', '技术支持', '使用教程']
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {Array.isArray(feature.features) ? feature.features.map((item: string, idx: number) => (
                    <li key={idx} className="text-gray-400 text-sm flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  )) : null}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">准备开始了吗？</h2>
            <p className="text-xl text-white/90 mb-8">
              加入数千名用户，体验智能化的社交媒体运营
            </p>
            <button
              onClick={handleGetStarted}
              className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              {isLoggedIn ? '进入控制台' : '立即免费使用'}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-xl">SocialAuto</span>
              </div>
              <p className="text-gray-400">智能社交媒体自动化平台</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">功能特性</a></li>
                <li><a href="#" className="hover:text-white transition-colors">定价方案</a></li>
                <li><a href="#" className="hover:text-white transition-colors">使用教程</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">支持</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">状态页面</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">公司</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">关于我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-white transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SocialAuto. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}