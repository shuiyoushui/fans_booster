'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  XAccountInfo, 
  XBindingStatus, 
  XAccountStats,
  DEFAULT_AUTO_GROW_SETTINGS 
} from '@/types/x-account';
import { XAccountAuthButton } from './XAccountAuth';
import { XAccountModal } from './XAccountModal';
import { ConfirmModal } from './ConfirmModal';
import { toast } from 'react-hot-toast';

interface XAccountListProps {
  className?: string;
}

export const XAccountList: React.FC<XAccountListProps> = ({ className = '' }) => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<XAccountInfo[]>([]);
  const [stats, setStats] = useState<XAccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<XAccountInfo | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<XAccountInfo | null>(null);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());

  // 获取账号列表
  const fetchAccounts = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/x/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setAccounts(data.accounts);
      } else {
        toast.error(data.error || 'Failed to fetch accounts');
      }
    } catch (error) {
      console.error('Fetch accounts error:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/x/accounts/stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  // 同步账号
  const handleSync = async (accountId: string) => {
    if (!token) return;

    setSyncingAccounts(prev => new Set(prev).add(accountId));

    try {
      const response = await fetch(`/api/x/accounts/${accountId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sync_types: ['profile', 'stats'],
          force_sync: false
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Sync task started');
        // 刷新账号列表
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to start sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  // 设置主账号
  const handleSetPrimary = async (accountId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/x/accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_primary: true
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Primary account updated');
        fetchAccounts();
      } else {
        toast.error(data.error || 'Failed to update primary account');
      }
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error('Failed to update primary account');
    }
  };

  // 删除账号
  const handleDeleteAccount = async () => {
    if (!token || !accountToDelete) return;

    try {
      const response = await fetch(`/api/x/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirm_username: accountToDelete.username
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account unbound successfully');
        fetchAccounts();
        setShowConfirmModal(false);
        setAccountToDelete(null);
      } else {
        toast.error(data.error || 'Failed to unbind account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to unbind account');
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchStats();
  }, [token]);

  const getStatusColor = (status: XBindingStatus) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'expired':
        return 'text-red-600 bg-red-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: XBindingStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'expired':
        return 'Expired';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600">Total Accounts</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total_accounts}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600">Active Accounts</h3>
            <p className="text-2xl font-bold text-green-600">{stats.active_accounts}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600">Total Followers</h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_followers.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600">Growth Today</h3>
            <p className="text-2xl font-bold text-blue-600">+{stats.accounts_growth_today}</p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">X Accounts</h2>
        <XAccountAuthButton 
          onSuccess={() => {
            fetchAccounts();
            fetchStats();
          }}
        />
      </div>

      {/* 账号列表 */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No X accounts bound</h3>
          <p className="text-gray-600 mb-4">Bind your first X account to get started</p>
          <XAccountAuthButton 
            onSuccess={() => {
              fetchAccounts();
              fetchStats();
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white p-6 rounded-lg border">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={account.avatar_url || '/default-avatar.png'}
                    alt={account.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{account.display_name}</h3>
                      {account.verified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {account.is_primary && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{account.username}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>{account.followers_count.toLocaleString()} followers</span>
                      <span>{account.following_count.toLocaleString()} following</span>
                      <span>{account.tweets_count.toLocaleString()} tweets</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(account.binding_status)}`}>
                        {getStatusText(account.binding_status)}
                      </span>
                      {account.auto_grow_enabled && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Auto Grow
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccounts.has(account.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    {syncingAccounts.has(account.id) ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                  {!account.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(account.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowAuthModal(true);
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setAccountToDelete(account);
                      setShowConfirmModal(true);
                    }}
                    className="p-2 text-red-600 hover:text-red-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑账号模态框 */}
      {selectedAccount && (
        <XAccountModal
          account={selectedAccount}
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setSelectedAccount(null);
          }}
          onSuccess={() => {
            fetchAccounts();
            fetchStats();
          }}
        />
      )}

      {/* 删除确认模态框 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Unbind X Account"
        message={`Are you sure you want to unbind the account @${accountToDelete?.username}? This action cannot be undone.`}
        confirmText="Unbind Account"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          setShowConfirmModal(false);
          setAccountToDelete(null);
        }}
        type="danger"
      />
    </div>
  );
};