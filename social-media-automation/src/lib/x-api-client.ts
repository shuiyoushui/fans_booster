// X API v2 客户端 - 替代Twint数据采集方案
// 基于Twitter API v2的官方数据获取接口

import { XUserInfo, XOAuthTokens } from './x-oauth-flow';

export interface XTweetMetrics {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
    bookmark_count: number;
  };
  author_id: string;
  context_annotations?: any[];
  entities?: any;
}

export interface XFollowersData {
  id: string;
  username: string;
  name: string;
  description?: string;
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at: string;
  protected: boolean;
  profile_image_url?: string;
}

export interface XAccountMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  // 最近30天的推文指标
  recent_metrics: {
    total_tweets: number;
    total_impressions: number;
    total_likes: number;
    total_retweets: number;
    total_replies: number;
    engagement_rate: number;
    avg_likes_per_tweet: number;
    avg_retweets_per_tweet: number;
  };
  // 粉丝增长数据
  follower_growth: {
    new_followers_7d: number;
    new_followers_30d: number;
    growth_rate_7d: number;
    growth_rate_30d: number;
  };
}

/**
 * X API v2 客户端
 */
export class XAPIClient {
  private accessToken: string;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * 获取用户基本信息
   */
  async getUserInfo(username?: string): Promise<XUserInfo> {
    const endpoint = username ? `/users/by/username/${username}` : '/users/me';
    const fields = 'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld';
    
    const response = await this.fetchAPI(`${endpoint}?user.fields=${fields}`);
    return response.data;
  }

  /**
   * 获取用户详细指标数据
   */
  async getUserMetrics(userId: string): Promise<XAccountMetrics> {
    // 获取用户基本信息
    const userInfo = await this.getUserInfoByUsername(userId);
    
    // 获取最近30天的推文
    const recentTweets = await this.getUserRecentTweets(userId, 30);
    
    // 计算推文指标
    const recentMetrics = this.calculateTweetMetrics(recentTweets);
    
    // 获取粉丝增长数据（模拟计算，实际需要历史数据）
    const followerGrowth = await this.calculateFollowerGrowth(userId);

    return {
      followers_count: userInfo.public_metrics.followers_count,
      following_count: userInfo.public_metrics.following_count,
      tweet_count: userInfo.public_metrics.tweet_count,
      listed_count: userInfo.public_metrics.listed_count,
      recent_metrics: recentMetrics,
      follower_growth: followerGrowth
    };
  }

  /**
   * 获取用户最近的推文
   */
  async getUserRecentTweets(userId: string, days: number = 7): Promise<XTweetMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startTime = startDate.toISOString().replace(/[:.]/g, '').replace('Z', '') + 'Z';
    const endTime = endDate.toISOString().replace(/[:.]/g, '').replace('Z', '') + 'Z';

    const query = `from:${userId} -is:retweet`;
    const fields = 'created_at,public_metrics,context_annotations,entities,author_id';
    
    const response = await this.fetchAPI(
      `/tweets/search/recent?query=${encodeURIComponent(query)}&tweet.fields=${fields}&start_time=${startTime}&end_time=${endTime}&max_results=100`
    );

    return response.data || [];
  }

  /**
   * 获取用户关注者列表
   */
  async getUserFollowers(userId: string, maxResults: number = 1000): Promise<XFollowersData[]> {
    const fields = 'created_at,description,public_metrics,verified,profile_image_url,protected';
    const followers: XFollowersData[] = [];
    let paginationToken: string | undefined;

    do {
      const url = `/users/${userId}/followers?user.fields=${fields}&max_results=${Math.min(1000, maxResults - followers.length)}`;
      const params = paginationToken ? `${url}&pagination_token=${paginationToken}` : url;
      
      const response = await this.fetchAPI(params);
      followers.push(...response.data);
      paginationToken = response.meta?.next_token;
    } while (paginationToken && followers.length < maxResults);

    return followers;
  }

  /**
   * 获取用户关注的人列表
   */
  async getUserFollowing(userId: string, maxResults: number = 1000): Promise<XFollowersData[]> {
    const fields = 'created_at,description,public_metrics,verified,profile_image_url,protected';
    const following: XFollowersData[] = [];
    let paginationToken: string | undefined;

    do {
      const url = `/users/${userId}/following?user.fields=${fields}&max_results=${Math.min(1000, maxResults - following.length)}`;
      const params = paginationToken ? `${url}&pagination_token=${paginationToken}` : url;
      
      const response = await this.fetchAPI(params);
      following.push(...response.data);
      paginationToken = response.meta?.next_token;
    } while (paginationToken && following.length < maxResults);

    return following;
  }

  /**
   * 获取推文的详细指标
   */
  async getTweetMetrics(tweetIds: string[]): Promise<XTweetMetrics[]> {
    const fields = 'created_at,public_metrics,context_annotations,entities,author_id';
    const response = await this.fetchAPI(
      `/tweets?ids=${tweetIds.join(',')}&tweet.fields=${fields}`
    );
    return response.data || [];
  }

  /**
   * 搜索推文
   */
  async searchTweets(query: string, maxResults: number = 100): Promise<XTweetMetrics[]> {
    const fields = 'created_at,public_metrics,context_annotations,entities,author_id';
    const response = await this.fetchAPI(
      `/tweets/search/recent?query=${encodeURIComponent(query)}&tweet.fields=${fields}&max_results=${maxResults}`
    );
    return response.data || [];
  }

  /**
   * 验证访问令牌
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.fetchAPI('/users/me');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 通用API请求方法
   */
  private async fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`X API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * 根据用户ID获取用户信息
   */
  private async getUserInfoByUsername(userId: string): Promise<XUserInfo> {
    const fields = 'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld';
    const response = await this.fetchAPI(`/users/${userId}?user.fields=${fields}`);
    return response.data;
  }

  /**
   * 计算推文指标
   */
  private calculateTweetMetrics(tweets: XTweetMetrics[]) {
    if (tweets.length === 0) {
      return {
        total_tweets: 0,
        total_impressions: 0,
        total_likes: 0,
        total_retweets: 0,
        total_replies: 0,
        engagement_rate: 0,
        avg_likes_per_tweet: 0,
        avg_retweets_per_tweet: 0
      };
    }

    const totalLikes = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.like_count, 0);
    const totalRetweets = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.retweet_count, 0);
    const totalReplies = tweets.reduce((sum, tweet) => sum + tweet.public_metrics.reply_count, 0);
    const totalImpressions = tweets.reduce((sum, tweet) => 
      sum + (tweet.public_metrics.impression_count || 0), 0);

    const totalEngagements = totalLikes + totalRetweets + totalReplies;
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    return {
      total_tweets: tweets.length,
      total_impressions: totalImpressions,
      total_likes: totalLikes,
      total_retweets: totalRetweets,
      total_replies: totalReplies,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
      avg_likes_per_tweet: parseFloat((totalLikes / tweets.length).toFixed(2)),
      avg_retweets_per_tweet: parseFloat((totalRetweets / tweets.length).toFixed(2))
    };
  }

  /**
   * 计算粉丝增长数据（模拟实现，实际需要历史数据对比）
   */
  private async calculateFollowerGrowth(userId: string) {
    // 这里是简化实现，实际应该存储历史数据进行对比
    const userInfo = await this.getUserInfoByUsername(userId);
    const currentFollowers = userInfo.public_metrics.followers_count;
    
    // 模拟计算（实际应该基于历史数据）
    return {
      new_followers_7d: Math.floor(currentFollowers * 0.02), // 假设7天增长2%
      new_followers_30d: Math.floor(currentFollowers * 0.08), // 假设30天增长8%
      growth_rate_7d: 2.0,
      growth_rate_30d: 8.0
    };
  }
}

/**
 * 创建X API客户端实例
 */
export function createXAPIClient(accessToken: string): XAPIClient {
  return new XAPIClient(accessToken);
}

/**
 * API使用量监控
 */
export class XAPIUsageMonitor {
  private endpointUsage = new Map<string, { count: number; resetTime: number }>();
  private rateLimits = {
    '/users/me': { limit: 75, window: 15 * 60 * 1000 }, // 75次/15分钟
    '/users': { limit: 75, window: 15 * 60 * 1000 },
    '/tweets': { limit: 75, window: 15 * 60 * 1000 },
    '/tweets/search/recent': { limit: 450, window: 15 * 60 * 1000 }
  };

  /**
   * 检查是否可以发起请求
   */
  canMakeRequest(endpoint: string): boolean {
    const key = this.getEndpointKey(endpoint);
    const limit = this.rateLimits[key as keyof typeof this.rateLimits];
    
    if (!limit) return true;

    const usage = this.endpointUsage.get(key);
    if (!usage) return true;

    const now = Date.now();
    if (now > usage.resetTime) {
      this.endpointUsage.delete(key);
      return true;
    }

    return usage.count < limit.limit;
  }

  /**
   * 记录API请求
   */
  recordRequest(endpoint: string, response?: Response): void {
    const key = this.getEndpointKey(endpoint);
    const limit = this.rateLimits[key as keyof typeof this.rateLimits];
    
    if (!limit) return;

    const usage = this.endpointUsage.get(key) || { count: 0, resetTime: Date.now() + limit.window };
    usage.count++;

    // 从响应头获取重置时间
    if (response) {
      const resetHeader = response.headers.get('x-rate-limit-reset');
      if (resetHeader) {
        usage.resetTime = parseInt(resetHeader) * 1000;
      }
    }

    this.endpointUsage.set(key, usage);
  }

  /**
   * 获取剩余请求次数
   */
  getRemainingRequests(endpoint: string): number {
    const key = this.getEndpointKey(endpoint);
    const limit = this.rateLimits[key as keyof typeof this.rateLimits];
    const usage = this.endpointUsage.get(key);

    if (!limit) return Infinity;
    if (!usage) return limit.limit;

    const now = Date.now();
    if (now > usage.resetTime) return limit.limit;

    return Math.max(0, limit.limit - usage.count);
  }

  private getEndpointKey(endpoint: string): string {
    for (const key of Object.keys(this.rateLimits)) {
      if (endpoint.startsWith(key)) return key;
    }
    return endpoint;
  }
}

// 全局使用量监控实例
export const xAPIUsageMonitor = new XAPIUsageMonitor();