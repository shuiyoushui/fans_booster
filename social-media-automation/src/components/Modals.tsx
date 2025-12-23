'use client';

import { useState, useEffect } from 'react';
import { GrowthTarget, SocialAccount } from '@/types';

interface BindAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function BindAccountModal({ isOpen, onClose, onSuccess, userId }: BindAccountModalProps) {
  const [formData, setFormData] = useState({
    platform: 'x',
    username: '',
    accessToken: '',
    refreshToken: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '绑定失败');
        return;
      }

      onSuccess();
      onClose();
      setFormData({
        platform: 'x',
        username: '',
        accessToken: '',
        refreshToken: '',
      });
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">绑定社交账号</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                平台
              </label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="x">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入用户名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                访问令牌
              </label>
              <input
                type="text"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="可选，用于自动数据获取"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                刷新令牌
              </label>
              <input
                type="text"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="可选，用于令牌刷新"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '绑定中...' : '绑定账号'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  socialAccounts: SocialAccount[];
}

export function CreateTargetModal({ isOpen, onClose, onSuccess, userId, socialAccounts }: CreateTargetModalProps) {
  const [formData, setFormData] = useState({
    accountId: '', // 可选
    targetMetric: 'followers',
    targetValue: '',
    deadline: '',
    autoOrderEnabled: false,
    budgetLimit: '',
    commentTemplates: [] as string[],
    useCustomComments: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commentInput, setCommentInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 验证评论内容（如果是评论目标）
    if (formData.targetMetric === 'comments' && formData.commentTemplates.length === 0) {
      setError('评论目标需要提供评论内容集');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/growth-targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          userId,
          targetValue: parseInt(formData.targetValue),
          budgetLimit: formData.budgetLimit ? parseFloat(formData.budgetLimit) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '创建失败');
        return;
      }

      onSuccess();
      onClose();
      setFormData({
        accountId: '',
        targetMetric: 'followers',
        targetValue: '',
        deadline: '',
        autoOrderEnabled: false,
        budgetLimit: '',
        commentTemplates: [],
        useCustomComments: false
      });
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const addCommentTemplate = () => {
    if (commentInput.trim() && formData.commentTemplates.length < 10) {
      setFormData({
        ...formData,
        commentTemplates: [...formData.commentTemplates, commentInput.trim()]
      });
      setCommentInput('');
    }
  };

  const removeCommentTemplate = (index: number) => {
    setFormData({
      ...formData,
      commentTemplates: formData.commentTemplates.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">创建增长目标</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择账号 <span className="text-gray-400">(可选)</span>
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">无绑定账号</option>
                {socialAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.username} ({account.platform.toUpperCase()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">不选择账号可以创建通用目标</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标指标
              </label>
              <select
                required
                value={formData.targetMetric}
                onChange={(e) => setFormData({ ...formData, targetMetric: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="followers">粉丝数</option>
                <option value="likes">点赞数</option>
                <option value="views">观看量</option>
                <option value="comments">评论数</option>
                <option value="shares">转发量</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标值
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入目标数值"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                截止日期
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预算限制 (USDT)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budgetLimit}
                onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="可选，设置最大预算"
              />
            </div>

            {/* 评论内容配置 */}
            {formData.targetMetric === 'comments' && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  评论内容集 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-3">添加用于自动评论的内容模板</p>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCommentTemplate())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入评论内容，按回车添加"
                    maxLength={200}
                  />
                  <button
                    type="button"
                    onClick={addCommentTemplate}
                    disabled={!commentInput.trim() || formData.commentTemplates.length >= 10}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.commentTemplates.map((comment, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm flex-1 truncate">{comment}</span>
                      <button
                        type="button"
                        onClick={() => removeCommentTemplate(index)}
                        className="text-red-600 hover:text-red-800 text-sm ml-2"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>

                {formData.commentTemplates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    已添加 {formData.commentTemplates.length}/10 条评论模板
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoOrderEnabled"
                checked={formData.autoOrderEnabled}
                onChange={(e) => setFormData({ ...formData, autoOrderEnabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoOrderEnabled" className="ml-2 block text-sm text-gray-900">
                启用自动下单
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建目标'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function RechargeModal({ isOpen, onClose, onSuccess, userId }: RechargeModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [depositInfo, setDepositInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的充值金额');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '创建充值失败');
        return;
      }

      setDepositInfo(data.transaction);
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">USDT充值</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!depositInfo ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  充值金额 (USDT)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入充值金额"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '生成中...' : '生成充值地址'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
              <h4 className="font-medium text-blue-900 mb-2">充值信息</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">充值金额:</span>
                  <span className="font-medium">{depositInfo.amount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">充值地址:</span>
                </div>
                <div className="bg-white p-2 rounded border font-mono text-xs break-all">
                  {depositInfo.depositAddress}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  请向上述地址转账，到账后余额将自动更新。
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(depositInfo.depositAddress);
                  alert('地址已复制到剪贴板');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                复制地址
              </button>
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                  setDepositInfo(null);
                  setAmount('');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 新增评论模板管理模态框
interface CommentTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function CommentTemplatesModal({ isOpen, onClose, onSuccess, userId }: CommentTemplatesModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'custom',
    templates: [''],
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchTemplates();
    }
  }, [isOpen, userId]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/comment-templates?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      setError('获取模板失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/comment-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...formData,
          templates: formData.templates.filter(t => t.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '创建失败');
        return;
      }

      setShowCreateForm(false);
      setFormData({ name: '', category: 'custom', templates: [''] });
      fetchTemplates();
      onSuccess();
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/comment-templates?id=${templateId}&userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTemplates();
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || '删除失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">评论内容管理</h3>
          <div className="flex space-x-2">
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                新建模板
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              关闭
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showCreateForm ? (
          <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-4">创建新模板</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="输入模板名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">评论内容</label>
                {formData.templates.map((template, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={template}
                      onChange={(e) => {
                        const newTemplates = [...formData.templates];
                        newTemplates[index] = e.target.value;
                        setFormData({ ...formData, templates: newTemplates });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder={`评论内容 ${index + 1}`}
                    />
                    {formData.templates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTemplates = formData.templates.filter((_, i) => i !== index);
                          setFormData({ ...formData, templates: newTemplates });
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, templates: [...formData.templates, ''] })}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  添加评论内容
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', category: 'custom', templates: [''] });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建模板'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {templates.map(template => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      template.category === 'general' ? 'bg-blue-100 text-blue-800' :
                      template.category === 'positive' ? 'bg-green-100 text-green-800' :
                      template.category === 'engaging' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {template.category === 'general' ? '通用' :
                       template.category === 'positive' ? '积极' :
                       template.category === 'engaging' ? '互动' : '自定义'}
                    </span>
                  </div>
                  {template.category === 'custom' && (
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {template.templates.slice(0, 3).map((tmpl: string, index: number) => (
                    <p key={index} className="text-sm text-gray-600">• {tmpl}</p>
                  ))}
                  {template.templates.length > 3 && (
                    <p className="text-sm text-gray-500">还有 {template.templates.length - 3} 条...</p>
                  )}
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-center text-gray-500 py-8">暂无评论模板</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}