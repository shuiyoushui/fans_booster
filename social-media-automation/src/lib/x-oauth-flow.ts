// X平台OAuth 2.0授权流程机制
// 基于Twitter API v2的Authorization Code Flow with PKCE

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
  description?: string;
  location?: string;
  website?: string;
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
  private stateStorage = new Map<string, XOAuthState>();

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

    // 保存状态信息
    this.stateStorage.set(state, {
      state,
      codeVerifier,
      codeChallenge,
      userId,
      timestamp: Date.now()
    });

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

    return { url: authUrl, state };
  }

  /**
   * 处理授权回调，交换access token
   */
  async handleCallback(code: string, state: string, storedState?: XOAuthState): Promise<XOAuthTokens> {
    // 验证state
    const stateData = storedState || this.stateStorage.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired state');
    }

    // 检查时间戳（state有效期15分钟）
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      this.stateStorage.delete(state);
      throw new Error('State expired');
    }

    try {
      // 交换access token
      const tokens = await this.exchangeCodeForToken(code, stateData.codeVerifier);
      
      // 清理状态
      this.stateStorage.delete(state);
      
      return tokens;
    } catch (error) {
      this.stateStorage.delete(state);
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
    const random = crypto.getRandomValues(new Uint8Array(32));
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(random)));
    const cleanState = base64.replace(/[+/=]/g, '').substring(0, 32);
    return userId ? `${userId}_${cleanState}` : cleanState;
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

  /**
   * 清理过期的state
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, stateData] of this.stateStorage.entries()) {
      if (now - stateData.timestamp > 15 * 60 * 1000) {
        this.stateStorage.delete(state);
      }
    }
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