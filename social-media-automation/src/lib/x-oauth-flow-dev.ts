// X平台OAuth 2.0授权流程机制 - 开发环境版本
// 模拟OAuth流程用于开发测试

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
 * X平台OAuth 2.0授权流程管理器 - 开发环境版本
 */
export class XOAuthFlowManagerDev {
  private config: XOAuthConfig;

  constructor(config: XOAuthConfig) {
    this.config = config;
  }

  /**
   * 生成OAuth 2.0授权URL - 开发环境模拟
   */
  async generateAuthUrl(userId?: string): Promise<{ url: string; state: string }> {
    console.log('DEV MODE: Generating mock OAuth URL for user:', userId);
    
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

    // 保存到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem(`oauth_state_${state}`, JSON.stringify(stateData));
    }

    // 开发环境使用模拟授权URL
    const mockAuthUrl = `http://localhost:3000/auth/x/mock-callback?state=${state}&code=mock_code_${Date.now()}`;

    console.log('DEV MODE: Mock OAuth URL generated:', {
      state: state.substring(0, 8) + '...',
      userId: userId,
      urlLength: mockAuthUrl.length,
      redirectUri: this.config.redirectUri
    });

    return { url: mockAuthUrl, state };
  }

  /**
   * 处理授权回调 - 开发环境模拟
   */
  async handleCallback(code: string, state: string): Promise<XOAuthTokens> {
    console.log('DEV MODE: Processing mock OAuth callback:', {
      hasCode: !!code,
      state: state?.substring(0, 8) + '...'
    });

    // 从本地存储获取状态
    let stateData: XOAuthState | null = null;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`oauth_state_${state}`);
      if (stored) {
        stateData = JSON.parse(stored);
        localStorage.removeItem(`oauth_state_${state}`);
      }
    }

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

    console.log('DEV MODE: State validated successfully');

    // 返回模拟的tokens
    const tokens: XOAuthTokens = {
      accessToken: `mock_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: `mock_refresh_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenType: 'Bearer',
      expiresIn: 7200, // 2小时
      scope: this.config.scopes.join(' ')
    };

    console.log('DEV MODE: Mock tokens generated successfully');
    
    return tokens;
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
   * 获取模拟用户信息
   */
  async getUserInfo(accessToken: string): Promise<XUserInfo> {
    console.log('DEV MODE: Returning mock user info');
    
    return {
      id: `mock_user_${Date.now()}`,
      username: 'mock_user_' + Math.random().toString(36).substr(2, 5),
      name: 'Mock Test User',
      email: 'mock@example.com',
      avatar_url: 'https://via.placeholder.com/150',
      profile_image_url: 'https://via.placeholder.com/150',
      description: 'This is a mock user for development testing',
      location: 'Mock City',
      website: 'https://example.com',
      url: 'https://example.com',
      verified: true,
      public_metrics: {
        followers_count: Math.floor(Math.random() * 10000) + 1000,
        following_count: Math.floor(Math.random() * 1000) + 100,
        tweet_count: Math.floor(Math.random() * 5000) + 500,
        listed_count: Math.floor(Math.random() * 50)
      },
      created_at: '2020-01-01T00:00:00.000Z',
      protected: false
    };
  }

  /**
   * 验证access token是否有效
   */
  async validateToken(accessToken: string): Promise<boolean> {
    console.log('DEV MODE: Always returning true for token validation');
    return true;
  }

  /**
   * 刷新access token
   */
  async refreshAccessToken(refreshToken: string): Promise<XOAuthTokens> {
    console.log('DEV MODE: Refreshing mock access token');
    
    return {
      accessToken: `mock_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refreshToken: refreshToken,
      tokenType: 'Bearer',
      expiresIn: 7200,
      scope: this.config.scopes.join(' ')
    };
  }

  /**
   * 撤销access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    console.log('DEV MODE: Mock token revocation');
  }
}

/**
 * 默认的OAuth配置
 */
export const DEFAULT_X_OAUTH_CONFIG: XOAuthConfig = {
  clientId: process.env.X_CLIENT_ID || 'mock_client_id',
  clientSecret: process.env.X_CLIENT_SECRET || 'mock_client_secret',
  redirectUri: process.env.X_REDIRECT_URI || 'http://localhost:3000/auth/x/callback',
  scopes: [
    'users.read',
    'offline.access',
    'tweet.read',
    'follows.read',
  ]
};

/**
 * 检查是否为开发环境
 */
function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         !process.env.X_CLIENT_ID || 
         process.env.X_CLIENT_ID === 'your-twitter-app-client-id';
}

/**
 * 创建OAuth流程管理器实例
 */
export function createXOAuthFlowManager(config?: Partial<XOAuthConfig>) {
  const finalConfig: XOAuthConfig = {
    clientId: config?.clientId || DEFAULT_X_OAUTH_CONFIG.clientId,
    clientSecret: config?.clientSecret || DEFAULT_X_OAUTH_CONFIG.clientSecret,
    redirectUri: config?.redirectUri || DEFAULT_X_OAUTH_CONFIG.redirectUri,
    scopes: config?.scopes || DEFAULT_X_OAUTH_CONFIG.scopes
  };

  if (isDevEnvironment()) {
    console.log('DEV MODE: Using mock OAuth flow manager');
    return new XOAuthFlowManagerDev(finalConfig);
  }

  // 在生产环境中导入真实的OAuth管理器
  const { XOAuthFlowManager } = require('./x-oauth-flow');
  return new XOAuthFlowManager(finalConfig);
}