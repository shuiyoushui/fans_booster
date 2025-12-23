import { XAccount, XAccountSyncLog, XAccountActivity, XPlatformConfig, UserXAccount, RateLimitConfig } from '@/lib/schema-x-accounts';
import { 
  XAccountInfo, 
  XBindingStatus, 
  XSyncType,
  XAccountStats,
  DEFAULT_AUTO_GROW_SETTINGS,
  XAutoGrowSettings
} from '@/types/x-account';

// 模拟数据库，实际项目中需要使用真实的数据库
const mockXAccounts: XAccount[] = [];
const mockSyncLogs: XAccountSyncLog[] = [];
const mockActivities: XAccountActivity[] = [];
const mockUserXAccounts: UserXAccount[] = [];
const mockPlatformConfig: XPlatformConfig = {
  id: 'platform-config-1',
  app_name: 'Social Media Automation',
  client_id: process.env.X_CLIENT_ID || '',
  client_secret: process.env.X_CLIENT_SECRET || '',
  webhook_url: '',
  webhook_secret: '',
  default_scopes: ['users.read', 'tweet.read', 'follows.read', 'follows.write', 'offline.access'],
  rate_limit_config: {
    follows_per_day: 400,
    unfollows_per_day: 400,
    tweets_per_day: 2400,
    likes_per_day: 1000,
    api_requests_per_hour: 300,
    reset_time_utc: '00:00:00'
  },
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

/**
 * 创建X账号绑定记录
 */
export async function createXAccount(accountData: Partial<XAccount>): Promise<XAccount> {
  const newAccount: XAccount = {
    id: `x-account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: accountData.user_id!,
    x_user_id: accountData.x_user_id!,
    username: accountData.username!,
    display_name: accountData.display_name!,
    email: accountData.email,
    avatar_url: accountData.avatar_url,
    bio: accountData.bio,
    location: accountData.location,
    website: accountData.website,
    verified: accountData.verified || false,
    followers_count: accountData.followers_count || 0,
    following_count: accountData.following_count || 0,
    tweets_count: accountData.tweets_count || 0,
    listed_count: accountData.listed_count || 0,
    account_created_at: accountData.account_created_at || new Date(),
    access_token: accountData.access_token!,
    refresh_token: accountData.refresh_token,
    token_expires_at: accountData.token_expires_at,
    scope: accountData.scope!,
    is_active: accountData.is_active ?? true,
    is_primary: accountData.is_primary ?? false,
    binding_status: accountData.binding_status || 'pending',
    last_sync_at: accountData.last_sync_at,
    last_error: accountData.last_error,
    auto_grow_enabled: accountData.auto_grow_enabled ?? false,
    auto_grow_settings: accountData.auto_grow_settings || DEFAULT_AUTO_GROW_SETTINGS,
    created_at: new Date(),
    updated_at: new Date()
  };

  mockXAccounts.push(newAccount);

  // 创建用户-账号关联记录
  const userXAccount: UserXAccount = {
    id: `user-x-account-${Date.now()}`,
    user_id: accountData.user_id!,
    x_account_id: newAccount.id,
    permission_level: 'owner',
    can_edit: true,
    can_delete: true,
    granted_at: new Date(),
    granted_by: accountData.user_id!
  };
  mockUserXAccounts.push(userXAccount);

  return newAccount;
}

/**
 * 根据X用户ID获取账号
 */
export async function getXAccountByXUserId(xUserId: string): Promise<XAccount | null> {
  return mockXAccounts.find(account => account.x_user_id === xUserId) || null;
}

/**
 * 根据账号ID获取X账号详情
 */
export async function getXAccountById(accountId: string, userId?: string): Promise<XAccount | null> {
  const account = mockXAccounts.find(acc => acc.id === accountId);
  if (!account) return null;
  
  // 如果指定了userId，检查权限
  if (userId) {
    const hasAccess = mockUserXAccounts.find(
      uxa => uxa.x_account_id === accountId && uxa.user_id === userId
    );
    if (!hasAccess) return null;
  }
  
  return account;
}

/**
 * 获取用户的X账号列表
 */
export async function getXAccountsByUserId(
  userId: string, 
  options: {
    page?: number;
    limit?: number;
    status?: XBindingStatus;
  } = {}
): Promise<{ accounts: XAccountInfo[]; total: number }> {
  const { page = 1, limit = 10, status } = options;
  
  let filteredAccounts = mockXAccounts.filter(account => {
    const userXAccount = mockUserXAccounts.find(
      uxa => uxa.x_account_id === account.id && uxa.user_id === userId
    );
    return userXAccount && (!status || account.binding_status === status);
  });

  const total = filteredAccounts.length;
  
  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  const accounts: XAccountInfo[] = paginatedAccounts.map(account => ({
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
    verified: account.verified,
    followers_count: account.followers_count,
    following_count: account.following_count,
    tweets_count: account.tweets_count,
    binding_status: account.binding_status,
    is_active: account.is_active,
    is_primary: account.is_primary,
    last_sync_at: account.last_sync_at?.toISOString(),
    auto_grow_enabled: account.auto_grow_enabled,
    created_at: account.created_at.toISOString()
  }));

  return { accounts, total };
}

/**
 * 获取X账号统计数据
 */
export async function getXAccountStats(userId: string): Promise<XAccountStats> {
  const userAccounts = mockXAccounts.filter(account => {
    const userXAccount = mockUserXAccounts.find(
      uxa => uxa.x_account_id === account.id && uxa.user_id === userId
    );
    return userXAccount;
  });

  const totalAccounts = userAccounts.length;
  const activeAccounts = userAccounts.filter(acc => acc.is_active && acc.binding_status === 'active').length;
  const primaryAccounts = userAccounts.filter(acc => acc.is_primary).length;
  const totalFollowers = userAccounts.reduce((sum, acc) => sum + acc.followers_count, 0);
  const totalFollowing = userAccounts.reduce((sum, acc) => sum + acc.following_count, 0);
  const totalTweets = userAccounts.reduce((sum, acc) => sum + acc.tweets_count, 0);

  const accountsByStatus: Record<XBindingStatus, number> = {
    pending: userAccounts.filter(acc => acc.binding_status === 'pending').length,
    active: userAccounts.filter(acc => acc.binding_status === 'active').length,
    expired: userAccounts.filter(acc => acc.binding_status === 'expired').length,
    error: userAccounts.filter(acc => acc.binding_status === 'error').length
  };

  // 模拟今日增长数据
  const accountsGrowthToday = Math.floor(Math.random() * 10);
  
  // 模拟同步成功率
  const syncSuccessRate = 85 + Math.random() * 15;

  // 获取最近同步时间
  const lastSyncTime = userAccounts
    .filter(acc => acc.last_sync_at)
    .sort((a, b) => (b.last_sync_at?.getTime() || 0) - (a.last_sync_at?.getTime() || 0))[0]?.last_sync_at;

  return {
    total_accounts: totalAccounts,
    active_accounts: activeAccounts,
    primary_accounts: primaryAccounts,
    total_followers: totalFollowers,
    total_following: totalFollowing,
    total_tweets: totalTweets,
    accounts_by_status: accountsByStatus,
    accounts_growth_today: accountsGrowthToday,
    sync_success_rate: syncSuccessRate,
    last_sync_time: lastSyncTime ? String(lastSyncTime) : undefined
  };
}

/**
 * 更新X账号信息
 */
export async function updateXAccount(
  accountId: string, 
  updateData: Partial<XAccount>
): Promise<XAccount> {
  const accountIndex = mockXAccounts.findIndex(acc => acc.id === accountId);
  if (accountIndex === -1) {
    throw new Error('X account not found');
  }

  const updatedAccount = {
    ...mockXAccounts[accountIndex],
    ...updateData,
    updated_at: new Date()
  };

  mockXAccounts[accountIndex] = updatedAccount;
  return updatedAccount;
}

/**
 * 批量更新X账号（根据条件）
 */
export async function updateXAccountsByCondition(
  updateData: Partial<XAccount>,
  conditions: {
    user_id?: string;
    is_primary?: boolean;
  }
): Promise<void> {
  mockXAccounts.forEach(account => {
    let shouldUpdate = true;
    
    if (conditions.user_id) {
      const userXAccount = mockUserXAccounts.find(
        uxa => uxa.x_account_id === account.id && uxa.user_id === conditions.user_id
      );
      shouldUpdate = shouldUpdate && !!userXAccount;
    }
    
    if (conditions.is_primary !== undefined) {
      shouldUpdate = shouldUpdate && account.is_primary === conditions.is_primary;
    }
    
    if (shouldUpdate) {
      Object.assign(account, updateData, { updated_at: new Date() });
    }
  });
}

/**
 * 更新X账号tokens
 */
export async function updateXAccountTokens(
  accountId: string,
  tokenData: {
    access_token: string;
    refresh_token?: string;
    token_expires_at?: Date;
    binding_status?: XBindingStatus;
    last_error?: string;
    updated_at: Date;
  }
): Promise<void> {
  await updateXAccount(accountId, tokenData);
}

/**
 * 删除X账号绑定
 */
export async function deleteXAccount(accountId: string, userId: string): Promise<void> {
  // 检查权限
  const userXAccount = mockUserXAccounts.find(
    uxa => uxa.x_account_id === accountId && uxa.user_id === userId && uxa.can_delete
  );
  if (!userXAccount) {
    throw new Error('Permission denied or account not found');
  }

  // 删除账号记录
  const accountIndex = mockXAccounts.findIndex(acc => acc.id === accountId);
  if (accountIndex !== -1) {
    mockXAccounts.splice(accountIndex, 1);
  }

  // 删除用户关联记录
  const userXAccountIndex = mockUserXAccounts.findIndex(
    uxa => uxa.x_account_id === accountId
  );
  if (userXAccountIndex !== -1) {
    mockUserXAccounts.splice(userXAccountIndex, 1);
  }

  // 删除相关的同步日志和活动记录
  const syncLogIndices = mockSyncLogs
    .map((log, index) => log.x_account_id === accountId ? index : -1)
    .filter(index => index !== -1)
    .sort((a, b) => b - a);
  
  syncLogIndices.forEach(index => {
    mockSyncLogs.splice(index, 1);
  });

  const activityIndices = mockActivities
    .map((activity, index) => activity.x_account_id === accountId ? index : -1)
    .filter(index => index !== -1)
    .sort((a, b) => b - a);
  
  activityIndices.forEach(index => {
    mockActivities.splice(index, 1);
  });
}

/**
 * 同步X账号数据 - 使用X API v2替代Twint
 */
export async function syncXAccount(
  accountId: string, 
  options: {
    sync_types: XSyncType[];
    force_sync?: boolean;
    user_id: string;
  }
): Promise<string> {
  // 检查权限
  const account = await getXAccountById(accountId, options.user_id);
  if (!account) {
    throw new Error('Account not found or permission denied');
  }

  // 检查token是否过期
  if (account.token_expires_at && account.token_expires_at < new Date()) {
    throw new Error('Access token expired, requires re-authorization');
  }

  // 创建同步任务记录
  const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  for (const syncType of options.sync_types) {
    const syncLog: XAccountSyncLog = {
      id: `${syncId}-${syncType}`,
      x_account_id: accountId,
      sync_type: syncType,
      sync_status: 'pending',
      started_at: new Date(),
      records_processed: 0,
      records_success: 0,
      records_failed: 0
    };
    mockSyncLogs.push(syncLog);
  }

  // 使用X API v2进行数据同步
  setTimeout(async () => {
    try {
      const { createXAPIClient } = await import('@/lib/x-api-client');
      const xApiClient = createXAPIClient(account.access_token!);

      // 同步基本信息
      if (options.sync_types.includes('profile')) {
        const userInfo = await xApiClient.getUserInfo();
        
        await updateXAccount(accountId, {
          display_name: userInfo.name,
          avatar_url: userInfo.profile_image_url,
          verified: userInfo.verified,
          bio: userInfo.description,
          location: userInfo.location,
          website: userInfo.url,
          followers_count: userInfo.public_metrics.followers_count,
          following_count: userInfo.public_metrics.following_count,
          tweets_count: userInfo.public_metrics.tweet_count,
          listed_count: userInfo.public_metrics.listed_count
        });

        // 更新同步日志
        const profileLog = mockSyncLogs.find(
          log => log.x_account_id === accountId && log.sync_type === 'profile'
        );
        if (profileLog) {
          profileLog.sync_status = 'completed';
          profileLog.completed_at = new Date();
          profileLog.records_processed = 1;
          profileLog.records_success = 1;
        }
      }

      // 同步详细指标
      if (options.sync_types.includes('metrics')) {
        const metrics = await xApiClient.getUserMetrics(account.x_user_id);
        
        // 更新额外的指标数据（可以存储在单独的表中）
        console.log('X Account metrics synced:', metrics);

        const metricsLog = mockSyncLogs.find(
          log => log.x_account_id === accountId && log.sync_type === 'metrics'
        );
        if (metricsLog) {
          metricsLog.sync_status = 'completed';
          metricsLog.completed_at = new Date();
          metricsLog.records_processed = 1;
          metricsLog.records_success = 1;
        }
      }

      // 同步关注者数据（可选，受API限制）
      if (options.sync_types.includes('followers')) {
        try {
          const followers = await xApiClient.getUserFollowers(account.x_user_id, 100);
          
          const followersLog = mockSyncLogs.find(
            log => log.x_account_id === accountId && log.sync_type === 'followers'
          );
          if (followersLog) {
            followersLog.sync_status = 'completed';
            followersLog.completed_at = new Date();
            followersLog.records_processed = followers.length;
            followersLog.records_success = followers.length;
          }
        } catch (followerError) {
          console.error('Followers sync error:', followerError);
          const followersLog = mockSyncLogs.find(
            log => log.x_account_id === accountId && log.sync_type === 'followers'
          );
          if (followersLog) {
            followersLog.sync_status = 'failed';
            followersLog.completed_at = new Date();
            followersLog.error_message = followerError instanceof Error ? followerError.message : 'Unknown error';
          }
        }
      }

      // 同步关注的人数据
      if (options.sync_types.includes('following')) {
        try {
          const following = await xApiClient.getUserFollowing(account.x_user_id, 100);
          
          const followingLog = mockSyncLogs.find(
            log => log.x_account_id === accountId && log.sync_type === 'following'
          );
          if (followingLog) {
            followingLog.sync_status = 'completed';
            followingLog.completed_at = new Date();
            followingLog.records_processed = following.length;
            followingLog.records_success = following.length;
          }
        } catch (followingError) {
          console.error('Following sync error:', followingError);
          const followingLog = mockSyncLogs.find(
            log => log.x_account_id === accountId && log.sync_type === 'following'
          );
          if (followingLog) {
            followingLog.sync_status = 'failed';
            followingLog.completed_at = new Date();
            followingLog.error_message = followingError instanceof Error ? followingError.message : 'Unknown error';
          }
        }
      }

      // 更新账号的最后同步时间
      await updateXAccount(accountId, {
        last_sync_at: new Date(),
        binding_status: 'active',
        last_error: undefined
      });

    } catch (error) {
      console.error('X API sync error:', error);
      
      // 同步失败，更新所有相关日志
      for (const syncType of options.sync_types) {
        const syncLog = mockSyncLogs.find(
          log => log.x_account_id === accountId && log.sync_type === syncType
        );
        if (syncLog) {
          syncLog.sync_status = 'failed';
          syncLog.completed_at = new Date();
          syncLog.error_message = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      await updateXAccount(accountId, {
        binding_status: 'error',
        last_error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, 1000);

  return syncId;
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(
  syncId: string, 
  accountId: string, 
  userId: string
): Promise<XAccountSyncLog[] | null> {
  // 检查权限
  const account = await getXAccountById(accountId, userId);
  if (!account) {
    return null;
  }

  // 获取相关的同步日志
  const syncLogs = mockSyncLogs.filter(log => 
    log.x_account_id === accountId && log.id.startsWith(syncId)
  );

  return syncLogs.length > 0 ? syncLogs : null;
}

/**
 * 更新用户-账号关联关系
 */
export async function updateUserXAccountRelation(
  accountId: string,
  updateData: Partial<XAccount>
): Promise<XAccount> {
  return await updateXAccount(accountId, updateData);
}

/**
 * 获取平台配置
 */
export async function getPlatformConfig(): Promise<XPlatformConfig | null> {
  return mockPlatformConfig;
}