'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestAuthPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [result, setResult] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 获取localStorage中的token和user
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    setToken(savedToken || '');
    setUser(savedUser ? JSON.parse(savedUser) : null);
  }, []);

  const testLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
    } catch (error) {
      setResult('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const testTwitterAPI = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      setResult('Testing with token: ' + currentToken?.substring(0, 20) + '...');

      const response = await fetch('/api/twitter/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          username: 'elonmusk',
          include_tweets: true,
          tweets_limit: 50
        }),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setResult('Auth cleared');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">认证测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">当前状态</h2>
          <div className="space-y-2">
            <p><strong>Token:</strong> {token ? token.substring(0, 50) + '...' : '无'}</p>
            <p><strong>User:</strong> {user ? JSON.stringify(user) : '无'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试操作</h2>
          <div className="space-x-4">
            <button
              onClick={testLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              测试登录
            </button>
            <button
              onClick={testTwitterAPI}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              测试Twitter API
            </button>
            <button
              onClick={clearAuth}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              清除认证
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">结果</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}