'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { XAccountInfo, XAutoGrowSettings, DEFAULT_AUTO_GROW_SETTINGS } from '@/types/x-account';
import { toast } from 'react-hot-toast';

interface XAccountModalProps {
  account: XAccountInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const XAccountModal: React.FC<XAccountModalProps> = ({
  account,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    is_primary: account.is_primary,
    auto_grow_enabled: account.auto_grow_enabled,
    auto_grow_settings: DEFAULT_AUTO_GROW_SETTINGS
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'auto-grow'>('basic');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        is_primary: account.is_primary,
        auto_grow_enabled: account.auto_grow_enabled,
        auto_grow_settings: DEFAULT_AUTO_GROW_SETTINGS
      });
    }
  }, [isOpen, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/x/accounts/${account.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || 'Failed to update account');
      }
    } catch (error) {
      console.error('Update account error:', error);
      toast.error('Failed to update account');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAutoGrowSettings = (key: keyof XAutoGrowSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      auto_grow_settings: {
        ...prev.auto_grow_settings,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={account.avatar_url || '/default-avatar.png'}
                alt={account.username}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{account.display_name}</h2>
                <p className="text-sm text-gray-600">@{account.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'basic'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Basic Settings
            </button>
            <button
              onClick={() => setActiveTab('auto-grow')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'auto-grow'
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Auto Grow Settings
            </button>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="is_primary" className="text-sm font-medium text-gray-900">
                  Set as Primary Account
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto_grow_enabled"
                  checked={formData.auto_grow_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, auto_grow_enabled: e.target.checked }))}
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="auto_grow_enabled" className="text-sm font-medium text-gray-900">
                  Enable Auto Growth
                </label>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Account Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Followers:</span>
                    <span className="ml-2 font-medium">{account.followers_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Following:</span>
                    <span className="ml-2 font-medium">{account.following_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tweets:</span>
                    <span className="ml-2 font-medium">{account.tweets_count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      account.binding_status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {account.binding_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auto-grow' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Daily Follow Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.auto_grow_settings.daily_follow_limit}
                    onChange={(e) => updateAutoGrowSettings('daily_follow_limit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Daily Unfollow Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.auto_grow_settings.daily_unfollow_limit}
                    onChange={(e) => updateAutoGrowSettings('daily_unfollow_limit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Target Followers Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.auto_grow_settings.target_followers_count}
                  onChange={(e) => updateAutoGrowSettings('target_followers_count', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Target Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.auto_grow_settings.target_keywords.join(', ')}
                  onChange={(e) => updateAutoGrowSettings('target_keywords', 
                    e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  )}
                  placeholder="marketing, business, tech"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Exclude Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.auto_grow_settings.exclude_keywords.join(', ')}
                  onChange={(e) => updateAutoGrowSettings('exclude_keywords', 
                    e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                  )}
                  placeholder="spam, bot, fake"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Min Followers Ratio
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={formData.auto_grow_settings.min_followers_ratio}
                    onChange={(e) => updateAutoGrowSettings('min_followers_ratio', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Max Following Ratio
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.auto_grow_settings.max_following_ratio}
                    onChange={(e) => updateAutoGrowSettings('max_following_ratio', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Account Age (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.auto_grow_settings.account_age_days}
                    onChange={(e) => updateAutoGrowSettings('account_age_days', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Growth Speed
                  </label>
                  <select
                    value={formData.auto_grow_settings.growth_speed}
                    onChange={(e) => updateAutoGrowSettings('growth_speed', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};