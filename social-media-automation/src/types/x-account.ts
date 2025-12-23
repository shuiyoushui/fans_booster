// X账号绑定相关的类型定义

// 基础X账号信息
export interface XAccountProfile {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar_url?: string;
  description?: string;
  location?: string;
  website?: string;
  verified: boolean;
  protected: boolean;
  created_at: string;
  public_metrics: XPublicMetrics;
}

// X账号公开指标
export interface XPublicMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
}

// X账号绑定请求
export interface BindXAccountRequest {
  // OAuth相关
  code: string;
  state: string;
  
  // 用户配置
  is_primary?: boolean;
  auto_grow_enabled?: boolean;
  auto_grow_settings?: XAutoGrowSettings;
}

// X账号绑定响应
export interface BindXAccountResponse {
  success: boolean;
  account?: XAccountInfo;
  error?: string;
  message?: string;
}

// X账号信息（简化版，用于前端显示）
export interface XAccountInfo {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  verified: boolean;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  binding_status: XBindingStatus;
  is_active: boolean;
  is_primary: boolean;
  last_sync_at?: string;
  auto_grow_enabled: boolean;
  created_at: string;
}

// 绑定状态枚举
export type XBindingStatus = 'pending' | 'active' | 'expired' | 'error';

// 权限级别枚举
export type XPermissionLevel = 'owner' | 'manager' | 'viewer';

// 自动增长设置
export interface XAutoGrowSettings {
  daily_follow_limit: number;
  daily_unfollow_limit: number;
  target_followers_count: number;
  target_keywords: string[];
  exclude_keywords: string[];
  min_followers_ratio: number;
  max_following_ratio: number;
  account_age_days: number;
  growth_speed: 'slow' | 'normal' | 'fast';
  enabled_features: string[];
}

// 默认自动增长设置
export const DEFAULT_AUTO_GROW_SETTINGS: XAutoGrowSettings = {
  daily_follow_limit: 50,
  daily_unfollow_limit: 50,
  target_followers_count: 10000,
  target_keywords: [],
  exclude_keywords: ['spam', 'bot', 'fake'],
  min_followers_ratio: 0.1,
  max_following_ratio: 10,
  account_age_days: 30,
  growth_speed: 'normal',
  enabled_features: ['follow', 'unfollow']
};

// X账号列表响应
export interface XAccountListResponse {
  success: boolean;
  accounts: XAccountInfo[];
  total: number;
  page: number;
  limit: number;
}

// X账号详情响应
export interface XAccountDetailResponse {
  success: boolean;
  account?: XAccountDetail;
  error?: string;
}

// X账号详细信息
export interface XAccountDetail extends XAccountInfo {
  bio?: string;
  location?: string;
  website?: string;
  email?: string;
  listed_count: number;
  account_created_at: string;
  token_expires_at?: string;
  scope: string;
  last_error?: string;
  auto_grow_settings?: XAutoGrowSettings;
  activities: XAccountActivity[];
  sync_logs: XSyncLog[];
}

// 账号活动记录
export interface XAccountActivity {
  id: string;
  activity_type: XActivityType;
  target_user_id?: string;
  target_tweet_id?: string;
  activity_data?: Record<string, any>;
  platform_status: XActivityStatus;
  platform_response?: string;
  error_message?: string;
  created_at: string;
}

// 活动类型枚举
export type XActivityType = 'follow' | 'unfollow' | 'tweet' | 'like' | 'retweet' | 'comment';

// 活动状态枚举
export type XActivityStatus = 'pending' | 'completed' | 'failed';

// 同步日志
export interface XSyncLog {
  id: string;
  sync_type: XSyncType;
  sync_status: XSyncStatus;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  records_success: number;
  records_failed: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

// 同步类型枚举
export type XSyncType = 'profile' | 'followers' | 'following' | 'tweets' | 'stats';

// 同步状态枚举
export type XSyncStatus = 'pending' | 'running' | 'completed' | 'failed';

// 更新X账号请求
export interface UpdateXAccountRequest {
  is_primary?: boolean;
  auto_grow_enabled?: boolean;
  auto_grow_settings?: Partial<XAutoGrowSettings>;
}

// 解绑X账号请求
export interface UnbindXAccountRequest {
  account_id: string;
  confirm_username: string; // 确认用户名，防止误操作
}

// 解绑响应
export interface UnbindXAccountResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// 同步X账号请求
export interface SyncXAccountRequest {
  account_id: string;
  sync_types: XSyncType[];
  force_sync?: boolean; // 是否强制同步（忽略速率限制）
}

// 同步响应
export interface SyncXAccountResponse {
  success: boolean;
  sync_id?: string;
  message?: string;
  error?: string;
}

// X账号统计数据
export interface XAccountStats {
  total_accounts: number;
  active_accounts: number;
  primary_accounts: number;
  total_followers: number;
  total_following: number;
  total_tweets: number;
  accounts_by_status: Record<XBindingStatus, number>;
  accounts_growth_today: number;
  sync_success_rate: number;
  last_sync_time?: string;
}

// X平台配置
export interface XPlatformConfig {
  id: string;
  app_name: string;
  client_id: string;
  webhook_url?: string;
  default_scopes: string[];
  rate_limit_config: XRateLimitConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 速率限制配置
export interface XRateLimitConfig {
  follows_per_day: number;
  unfollows_per_day: number;
  tweets_per_day: number;
  likes_per_day: number;
  api_requests_per_hour: number;
  reset_time_utc: string;
}

// OAuth授权URL生成请求
export interface GenerateAuthUrlRequest {
  redirect_uri?: string;
  scopes?: string[];
  state?: string;
}

// OAuth授权URL响应
export interface GenerateAuthUrlResponse {
  success: boolean;
  auth_url?: string;
  state?: string;
  error?: string;
}

// OAuth回调处理请求
export interface HandleOAuthCallbackRequest {
  code: string;
  state: string;
  user_preferences?: {
    is_primary?: boolean;
    auto_grow_enabled?: boolean;
    auto_grow_settings?: XAutoGrowSettings;
  };
}

// Token验证请求
export interface ValidateTokenRequest {
  access_token: string;
}

// Token验证响应
export interface ValidateTokenResponse {
  valid: boolean;
  user_info?: XAccountProfile;
  expires_in?: number;
  error?: string;
}

// Token刷新请求
export interface RefreshTokenRequest {
  refresh_token: string;
}

// Token刷新响应
export interface RefreshTokenResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

// 错误响应类型
export interface XErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// API响应包装类型
export type XApiResponse<T = any> = T | XErrorResponse;

// 类型守卫函数
export function isXErrorResponse(response: any): response is XErrorResponse {
  return response && typeof response === 'object' && response.success === false;
}

// 常用错误代码
export const X_ERROR_CODES = {
  INVALID_CODE: 'INVALID_CODE',
  INVALID_STATE: 'INVALID_STATE',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  BINDING_FAILED: 'BINDING_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type XErrorCode = typeof X_ERROR_CODES[keyof typeof X_ERROR_CODES];