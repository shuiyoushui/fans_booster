// X平台OAuth 2.0授权流程机制
// 基于Twitter API v2的Authorization Code Flow with PKCE

import { saveOAuthState, getOAuthState, deleteOAuthState, getOAuthStateStats } from './simple-oauth-state';

export interface XOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface XOAuthState {
  state: string;           // 防CSRF攻击的随机字符串
  codeVerifier: string;     // PKCE验证码
  codeChallenge: string;    // PKCE挑战码
  userId?: string;         // 当前用户ID（可选）
  timestamp: number;       // 时间戳
}

export interface XOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}

export interface XUserInfo {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar_url?: string;
  profile_image_url?: string;  // X API返回的字段名
  description?: string;
  location?: string;
  website?: string;
  url?: string;  // X API返回的网站字段
  verified: boolean;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
  created_at: string;
  protected: boolean;
}

/**
 * X平台OAuth 2.0授权流程管理器
 */
export class XOAuthFlowManager {
  private config: XOAuthConfig;

  constructor(config: XOAuthConfig) {
    this.config = config;
  }

  /**
   * 生成OAuth 2.0授权URL
   */
  async generateAuthUrl(userId?: string): Promise<{ url: string; state: string }> {
    
    const state = this.generateState(userId);
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const stateData: XOAuthState = {
      state,
      codeVerifier,
      codeChallenge,
      userId,
      timestamp: Date.now()
    };

    console.log('Generating OAuth URL with state:', state.substring(0, 8) + '...');

    try {
      // 保存到状态管理器
      saveOAuthState(stateData);
      
      // 立即验证状态是否正确保存
      const verification = getOAuthState(state);
      if (!verification) {
        throw new Error('State verification failed immediately after save');
      }
      
      // 验证保存的数据完整性
      if (!verification.codeVerifier || !verification.codeChallenge) {
        throw new Error('Saved state data is incomplete');
      }
      
      console.log('OAuth state generated and verified successfully:', {
        state: state.substring(0, 8) + '...',
        userId: userId,
        hasCodeVerifier: !!verification.codeVerifier,
        hasCodeChallenge: !!verification.codeChallenge
      });
      
    } catch (error) {
      console.error('Failed to save OAuth state:', error);
      throw new Error(`Failed to generate OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    console.log('Authorization URL generated:', {
      state: state.substring(0, 8) + '...',
      userId: userId,
      urlLength: authUrl.length,
      redirectUri: this.config.redirectUri
    });

    return { url: authUrl, state };
  }

  /**
   * 处理授权回调，交换access token
   */
  async handleCallback(code: string, state: string): Promise<XOAuthTokens> {
    console.log('Starting OAuth callback processing:', {
      hasCode: !!code,
      state: state?.substring(0, 8) + '...'
    });

    // 输入验证
    if (!code || !state) {
      throw new Error(`Invalid callback parameters: ${!code ? 'missing code' : ''}${!state ? 'missing state' : ''}`);
    }

    // 从状态管理器查找
    const stateData = getOAuthState(state);
    
    if (!stateData) {
      // 调试：获取状态统计
      const stats = getOAuthStateStats();
      console.error('OAuth state not found:', {
        state: state.substring(0, 8) + '...',
        availableStates: stats.total,
        currentTime: new Date().toISOString()
      });
      
      // 分析state格式，提供更详细的错误信息
      const stateParts = state.split('_');
      let enhancedError = `Invalid or expired state: state not found in storage. Available states: ${stats.total}`;
      
      if (stateParts.length === 2) {
        const timestamp = parseInt(stateParts[0]);
        if (!isNaN(timestamp)) {
          const stateTime = new Date(timestamp);
          const now = new Date();
          const ageHours = (now.getTime() - timestamp) / (1000 * 60 * 60);
          
          if (ageHours > 0) { // 如果是过去的时间戳
            enhancedError = `Expired authorization URL. The authorization link was generated ${Math.round(ageHours)} hours ago (at ${stateTime.toISOString()}) and has expired. Please request a new authorization URL and try again.`;
          } else {
            enhancedError = `Invalid authorization URL. The timestamp ${timestamp} appears to be from the future. Please generate a new authorization URL.`;
          }
        }
      }
      
      // 提供所有可用状态的预览用于调试
      const availableStatePreviews = stats.states.map(s => s.state).join(', ');
      
      throw new Error(`${enhancedError} Available states: [${availableStatePreviews}]`);
    }

    // 验证状态数据完整性
    if (!stateData.codeVerifier || !stateData.codeChallenge) {
      console.error('OAuth state data corrupted:', {
        state: state.substring(0, 8) + '...',
        hasCodeVerifier: !!stateData.codeVerifier,
        hasCodeChallenge: !!stateData.codeChallenge
      });
      
      // 清理损坏的状态
      deleteOAuthState(state);
      throw new Error('Invalid state: corrupted state data (missing codeVerifier or codeChallenge)');
    }

    // 检查时间戳（state有效期15分钟）
    const age = Date.now() - stateData.timestamp;
    if (age > 15 * 60 * 1000) {
      console.error('OAuth state expired:', { 
        state: state.substring(0, 8) + '...', 
        age: Math.round(age / 1000) + 's',
        userId: stateData.userId,
        expiredAt: new Date(stateData.timestamp + 15 * 60 * 1000).toISOString()
      });
      
      // 清理过期状态
      deleteOAuthState(state);
      throw new Error(`Invalid or expired state: state expired (${Math.round(age / 1000)}s ago, max allowed: 900s)`);
    }

    console.log('OAuth state validated successfully:', {
      state: state.substring(0, 8) + '...',
      age: Math.round(age / 1000) + 's',
      userId: stateData.userId,
      hasCodeVerifier: !!stateData.codeVerifier,
      hasCodeChallenge: !!stateData.codeChallenge
    });

    try {
      // 交换access token
      const tokens = await this.exchangeCodeForToken(code, stateData.codeVerifier);
      
      console.log('Token exchange successful:', {
        hasAccessToken: !!tokens.accessToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
        hasRefreshToken: !!tokens.refreshToken
      });
      
      console.log('Cleaning up OAuth state after successful exchange...');
      
      // 清理状态
      deleteOAuthState(state);
      
      return tokens;
    } catch (error) {
      console.error('Token exchange failed:', error);
      
      // 不要立即清理状态，给用户重试机会
      // 但记录错误以便后续调试
      console.error('State preserved for potential retry:', {
        state: state.substring(0, 8) + '...',
        age: Math.round(age / 1000) + 's',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * 使用refresh token刷新access token
   */
  async refreshAccessToken(refreshToken: string): Promise<XOAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    };
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(accessToken: string): Promise<XUserInfo> {
    const fields = [
      'created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,withheld'
    ].join(',');

    const response = await fetch(
      `https://api.twitter.com/2/users/me?user.fields=${fields}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = await response.json();
    if (!data.data) {
      throw new Error('No user data received');
    }

    return data.data;
  }

  /**
   * 验证access token是否有效
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 撤销access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const params = new URLSearchParams({
      token: accessToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    await fetch('https://api.twitter.com/2/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
  }

  /**
   * 生成随机state字符串
   */
  private generateState(userId?: string): string {
    // 使用更安全的随机值生成方法
    const random = crypto.getRandomValues(new Uint8Array(24));
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(random)));
    
    // 清理base64字符串，移除特殊字符，只保留字母和数字
    const cleanState = base64
      .replace(/[+/=]/g, '') // 移除 + / = 字符
      .replace(/[^a-zA-Z0-9]/g, '') // 移除任何其他非字母数字字符
      .substring(0, 32); // 确保长度为32字符
    
    // 如果有userId，将其哈希后添加到state中，避免直接包含用户ID
    if (userId) {
      const userHash = crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId))
        .then(hash => {
          const hashArray = Array.from(new Uint8Array(hash));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        });
      
      // 同步获取简化的用户标识
      const userPrefix = userId.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
      return `${userPrefix}_${cleanState}`;
    }
    
    return cleanState;
  }

  /**
   * 生成PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const random = crypto.getRandomValues(new Uint8Array(32));
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(random)));
    return base64.replace(/[+/=]/g, '').substring(0, 128);
  }

  /**
   * 生成PKCE code challenge
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))));
    return base64.replace(/[+/=]/g, '');
  }

  /**
   * 交换授权码获取access token
   */
  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<XOAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code: code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier
    });

    // 如果有client_secret，添加到请求中（机密客户端）
    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      scope: data.scope
    };
  }


}

/**
 * 默认的OAuth配置
 */
export const DEFAULT_X_OAUTH_CONFIG: XOAuthConfig = {
  clientId: process.env.X_CLIENT_ID || '',
  clientSecret: process.env.X_CLIENT_SECRET || '',
  redirectUri: process.env.X_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/auth/x/callback`,
  scopes: [
    'users.read',           // 读取用户信息
    'offline.access',       // 获取refresh token
    'tweet.read',           // 读取推文
    'follows.read',         // 读取关注关系
  ]
};

// 调试环境变量
console.log('X OAuth Config:', {
  clientId: process.env.X_CLIENT_ID?.substring(0, 10) + '...',
  clientSecret: process.env.X_CLIENT_SECRET?.substring(0, 10) + '...',
  redirectUri: process.env.X_REDIRECT_URI,
  appUrl: process.env.NEXT_PUBLIC_APP_URL
});

/**
 * 创建OAuth流程管理器实例
 */
export function createXOAuthFlowManager(config?: Partial<XOAuthConfig>): XOAuthFlowManager {
  const finalConfig: XOAuthConfig = {
    clientId: config?.clientId || DEFAULT_X_OAUTH_CONFIG.clientId,
    clientSecret: config?.clientSecret || DEFAULT_X_OAUTH_CONFIG.clientSecret,
    redirectUri: config?.redirectUri || DEFAULT_X_OAUTH_CONFIG.redirectUri,
    scopes: config?.scopes || DEFAULT_X_OAUTH_CONFIG.scopes
  };
  return new XOAuthFlowManager(finalConfig);
}