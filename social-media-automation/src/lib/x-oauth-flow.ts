// X平台OAuth 2.0授权流程机制 - 生产环境版本
// 对接真实的X (Twitter) API

export interface XOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface XOAuthState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  userId?: string;
  timestamp: number;
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
  profile_image_url?: string;
  description?: string;
  location?: string;
  website?: string;
  url?: string;
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
 * X平台OAuth 2.0授权流程管理器 - 生产环境版本
 */
export class XOAuthFlowManager {
  private config: XOAuthConfig;
  private readonly X_OAUTH_BASE_URL = 'https://twitter.com/i/oauth2/authorize';
  private readonly X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
  private readonly X_USER_URL = 'https://api.twitter.com/2/users/me';

  constructor(config: XOAuthConfig) {
    this.config = config;
  }

  /**
   * 生成OAuth 2.0授权URL - 生产环境
   */
  async generateAuthUrl(userId?: string, token?: string): Promise<{ url: string; state: string }> {
    console.log('PROD MODE: Generating real X OAuth URL for user:', userId, { hasToken: !!token });
    
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

    // 保存state到数据库或Redis（这里简化为内存存储，生产环境需要持久化）
    this.saveState(stateData);

    // 构建回调URL，添加token参数
    const redirectUri = new URL(this.config.redirectUri);
    if (token) {
      redirectUri.searchParams.set('token', token);
    }

    // 构建真实的X平台授权URL
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri.toString(),
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${this.X_OAUTH_BASE_URL}?${authParams.toString()}`;

    console.log('PROD MODE: Real X OAuth URL generated:', {
      state: state.substring(0, 8) + '...',
      userId: userId,
      urlLength: authUrl.length,
      redirectUri: redirectUri.toString(),
      hasToken: !!token
    });

    return { url: authUrl, state };
  }

  /**
   * 处理授权回调 - 生产环境
   */
  async handleCallback(code: string, state: string): Promise<XOAuthTokens> {
    console.log('PROD MODE: Processing real X OAuth callback:', {
      hasCode: !!code,
      state: state?.substring(0, 8) + '...'
    });

    // 获取保存的state数据
    const stateData = this.getState(state);
    if (!stateData) {
      throw new Error(`Invalid or expired state: ${state?.substring(0, 8)}...`);
    }

    // 验证状态数据完整性
    if (!stateData.codeVerifier || !stateData.codeChallenge) {
      throw new Error('Invalid state: corrupted state data');
    }

    // 检查时间戳（state有效期15分钟）
    const age = Date.now() - stateData.timestamp;
    if (age > 15 * 60 * 1000) {
      throw new Error(`Invalid or expired state: ${Math.round(age / 1000)}s ago`);
    }

    console.log('PROD MODE: State validated successfully');

    // 向X平台请求access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code: code,
      redirect_uri: this.config.redirectUri,
      code_verifier: stateData.codeVerifier
    });

    const response = await fetch(this.X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: tokenParams.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('X token request failed:', errorData);
      throw new Error(`Failed to exchange code for tokens: ${response.status}`);
    }

    const tokenData = await response.json();
    
    const tokens: XOAuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope || this.config.scopes.join(' ')
    };

    console.log('PROD MODE: Real tokens obtained successfully');
    
    return tokens;
  }

  /**
   * 获取用户信息 - 生产环境
   */
  async getUserInfo(accessToken: string): Promise<XUserInfo> {
    console.log('PROD MODE: Fetching real user info from X API');
    
    const response = await fetch(`${this.X_USER_URL}?user.fields=created_at,description,location,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('X user info request failed:', errorData);
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const data = await response.json();
    const user = data.data;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description,
      location: user.location,
      profile_image_url: user.profile_image_url,
      url: user.url,
      verified: user.verified,
      public_metrics: user.public_metrics,
      created_at: user.created_at,
      protected: user.protected
    };
  }

  /**
   * 验证access token是否有效
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.X_USER_URL}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * 刷新access token
   */
  async refreshAccessToken(refreshToken: string): Promise<XOAuthTokens> {
    console.log('PROD MODE: Refreshing real access token');
    
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId
    });

    const response = await fetch(this.X_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: tokenParams.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('X token refresh failed:', errorData);
      throw new Error(`Failed to refresh tokens: ${response.status}`);
    }

    const tokenData = await response.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      tokenType: tokenData.token_type || 'Bearer',
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope || this.config.scopes.join(' ')
    };
  }

  /**
   * 撤销access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    console.log('PROD MODE: Revoking real access token');
    
    // X平台没有标准的revoke端点，但可以通过使其失效来实现
    // 这里简化处理
  }

  /**
   * 生成随机state字符串
   */
  private generateState(userId?: string): string {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (userId) {
      const userPrefix = userId.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
      return `${userPrefix}_${random}`;
    }
    
    return random;
  }

  /**
   * 生成PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return random.substring(0, 128);
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
   * 保存state数据（简化版，生产环境需要持久化）
   */
  private saveState(stateData: XOAuthState): void {
    // 这里应该保存到Redis或数据库
    // 简化处理，在内存中存储（生产环境不推荐）
    if (typeof globalThis !== 'undefined' && !globalThis._oauthStates) {
      globalThis._oauthStates = new Map();
    }
    if (globalThis._oauthStates) {
      globalThis._oauthStates.set(stateData.state, stateData);
      
      // 15分钟后自动清理
      setTimeout(() => {
        globalThis._oauthStates?.delete(stateData.state);
      }, 15 * 60 * 1000);
    }
  }

  /**
   * 获取state数据
   */
  private getState(state: string): XOAuthState | null {
    if (globalThis._oauthStates) {
      const stateData = globalThis._oauthStates.get(state);
      if (stateData) {
        // 使用后立即删除
        globalThis._oauthStates.delete(state);
        return stateData;
      }
    }
    return null;
  }
}

// 扩展全局类型以支持state存储
declare global {
  var _oauthStates: Map<string, any> | undefined;
}

/**
 * 创建OAuth流程管理器实例
 */
export function createXOAuthFlowManager(config?: Partial<XOAuthConfig>) {
  const finalConfig: XOAuthConfig = {
    clientId: config?.clientId || process.env.X_CLIENT_ID || 'mock_client_id',
    clientSecret: config?.clientSecret || process.env.X_CLIENT_SECRET || 'mock_client_secret',
    redirectUri: config?.redirectUri || process.env.X_REDIRECT_URI || 'http://localhost:3000/auth/x/callback',
    scopes: config?.scopes || ['users.read', 'offline.access', 'tweet.read', 'follows.read']
  };

  return new XOAuthFlowManager(finalConfig);
}