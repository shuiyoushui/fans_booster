// X账号绑定相关的数据库表结构定义

// X账号表
export interface XAccount {
  id: string;                    // 主键 UUID
  user_id: string;              // 用户ID，关联users表
  x_user_id: string;            // X平台用户ID
  username: string;             // X用户名
  display_name: string;         // 显示名称
  email?: string;               // 邮箱（可选）
  avatar_url?: string;          // 头像URL
  bio?: string;                 // 个人简介
  location?: string;             // 位置
  website?: string;             // 个人网站
  verified: boolean;            // 是否认证用户
  followers_count: number;      // 粉丝数
  following_count: number;      // 关注数
  tweets_count: number;         // 推文数
  listed_count: number;         // 列表数
  account_created_at: Date;     // 账号创建时间
  
  // OAuth相关字段
  access_token: string;          // 访问令牌
  refresh_token?: string;       // 刷新令牌
  token_expires_at?: Date;      // 令牌过期时间
  scope: string;                // 授权范围
  
  // 绑定信息
  is_active: boolean;           // 是否激活
  is_primary: boolean;          // 是否主账号
  binding_status: 'pending' | 'active' | 'expired' | 'error'; // 绑定状态
  last_sync_at?: Date;          // 最后同步时间
  last_error?: string;          // 最后错误信息
  
  // 应用配置
  auto_grow_enabled: boolean;   // 是否启用自动增长
  auto_grow_settings?: XAutoGrowSettings; // 自动增长设置
  
  // 关联数据（用于详细信息）
  activities?: XAccountActivity[]; // 活动记录
  sync_logs?: XAccountSyncLog[];   // 同步日志
  
  // 时间戳
  created_at: Date;
  updated_at: Date;
}

// 自动增长设置
export interface XAutoGrowSettings {
  daily_follow_limit: number;   // 每日关注上限
  daily_unfollow_limit: number; // 每日取消关注上限
  target_followers_count: number; // 目标粉丝数
  target_keywords: string[];    // 目标关键词
  exclude_keywords: string[];   // 排除关键词
  min_followers_ratio: number;  // 最小粉丝比例
  max_following_ratio: number;  // 最大关注比例
  account_age_days: number;     // 账号最小天数
  growth_speed: 'slow' | 'normal' | 'fast'; // 增长速度
  enabled_features: string[];    // 启用的功能
}

// X账号同步日志表
export interface XAccountSyncLog {
  id: string;
  x_account_id: string;         // 关联X账号
  sync_type: 'profile' | 'followers' | 'following' | 'tweets' | 'stats';
  sync_status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date | string;
  completed_at?: Date | string;
  records_processed: number;
  records_success: number;
  records_failed: number;
  error_message?: string;
  metadata?: Record<string, any>; // 额外的同步数据
}

// X账号活动记录表
export interface XAccountActivity {
  id: string;
  x_account_id: string;         // 关联X账号
  activity_type: 'follow' | 'unfollow' | 'tweet' | 'like' | 'retweet' | 'comment';
  target_user_id?: string;      // 目标用户ID（关注/取消关注时）
  target_tweet_id?: string;     // 目标推文ID
  activity_data?: Record<string, any>; // 活动详细数据
  platform_status: 'pending' | 'completed' | 'failed';
  platform_response?: string;    // 平台响应
  error_message?: string;
  created_at: Date | string;
}

// X平台配置表（应用级配置）
export interface XPlatformConfig {
  id: string;
  app_name: string;             // 应用名称
  client_id: string;            // X应用Client ID
  client_secret: string;        // X应用Client Secret
  bearer_token?: string;        // Bearer Token（应用级）
  webhook_url?: string;         // Webhook回调URL
  webhook_secret?: string;      // Webhook密钥
  default_scopes: string[];     // 默认授权范围
  rate_limit_config: RateLimitConfig; // 速率限制配置
  is_active: boolean;           // 是否启用
  created_at: Date;
  updated_at: Date;
}

// 速率限制配置
export interface RateLimitConfig {
  follows_per_day: number;      // 每日关注限制
  unfollows_per_day: number;    // 每日取消关注限制
  tweets_per_day: number;       // 每日推文限制
  likes_per_day: number;        // 每日点赞限制
  api_requests_per_hour: number; // 每小时API请求限制
  reset_time_utc: string;       // 重置时间（UTC）
}

// 用户X账号关联表（用户可以绑定多个X账号）
export interface UserXAccount {
  id: string;
  user_id: string;              // 用户ID
  x_account_id: string;         // X账号ID
  permission_level: 'owner' | 'manager' | 'viewer'; // 权限级别
  can_edit: boolean;            // 是否可编辑
  can_delete: boolean;          // 是否可删除
  granted_at: Date;            // 授权时间
  granted_by: string;          // 授权人ID
}

// SQL表创建语句
export const createXAccountsTable = `
CREATE TABLE IF NOT EXISTS x_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_user_id VARCHAR(50) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  website VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tweets_count INTEGER DEFAULT 0,
  listed_count INTEGER DEFAULT 0,
  account_created_at TIMESTAMP,
  
  -- OAuth相关
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  scope VARCHAR(500) NOT NULL,
  
  -- 绑定状态
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  binding_status VARCHAR(20) DEFAULT 'pending' CHECK (binding_status IN ('pending', 'active', 'expired', 'error')),
  last_sync_at TIMESTAMP,
  last_error TEXT,
  
  -- 自动增长配置
  auto_grow_enabled BOOLEAN DEFAULT FALSE,
  auto_grow_settings JSONB,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  CONSTRAINT x_accounts_user_x_user_id_unique UNIQUE(user_id, x_user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_x_accounts_user_id ON x_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_x_user_id ON x_accounts(x_user_id);
CREATE INDEX IF NOT EXISTS idx_x_accounts_binding_status ON x_accounts(binding_status);
CREATE INDEX IF NOT EXISTS idx_x_accounts_is_active ON x_accounts(is_active);
`;

export const createXAccountSyncLogsTable = `
CREATE TABLE IF NOT EXISTS x_account_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_account_id UUID NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('profile', 'followers', 'following', 'tweets', 'stats')),
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_x_sync_logs_account_id ON x_account_sync_logs(x_account_id);
CREATE INDEX IF NOT EXISTS idx_x_sync_logs_status ON x_account_sync_logs(sync_status);
`;

export const createXAccountActivitiesTable = `
CREATE TABLE IF NOT EXISTS x_account_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_account_id UUID NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('follow', 'unfollow', 'tweet', 'like', 'retweet', 'comment')),
  target_user_id VARCHAR(50),
  target_tweet_id VARCHAR(50),
  activity_data JSONB,
  platform_status VARCHAR(20) DEFAULT 'pending' CHECK (platform_status IN ('pending', 'completed', 'failed')),
  platform_response TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_x_activities_account_id ON x_account_activities(x_account_id);
CREATE INDEX IF NOT EXISTS idx_x_activities_type ON x_account_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_x_activities_status ON x_account_activities(platform_status);
`;

export const createXPlatformConfigTable = `
CREATE TABLE IF NOT EXISTS x_platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name VARCHAR(100) NOT NULL,
  client_id VARCHAR(100) NOT NULL UNIQUE,
  client_secret TEXT NOT NULL,
  bearer_token TEXT,
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(100),
  default_scopes TEXT[] DEFAULT ARRAY['users.read', 'tweet.read', 'follows.read', 'follows.write'],
  rate_limit_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO x_platform_config (app_name, client_id, client_secret, rate_limit_config) 
VALUES ('Social Media Automation', '', '', '{
  "follows_per_day": 400,
  "unfollows_per_day": 400,
  "tweets_per_day": 2400,
  "likes_per_day": 1000,
  "api_requests_per_hour": 300,
  "reset_time_utc": "00:00:00"
}')
ON CONFLICT (client_id) DO NOTHING;
`;

export const createUserXAccountsTable = `
CREATE TABLE IF NOT EXISTS user_x_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_account_id UUID NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'owner' CHECK (permission_level IN ('owner', 'manager', 'viewer')),
  can_edit BOOLEAN DEFAULT TRUE,
  can_delete BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT user_x_accounts_unique UNIQUE(user_id, x_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_x_accounts_user_id ON user_x_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_x_accounts_x_account_id ON user_x_accounts(x_account_id);
`;