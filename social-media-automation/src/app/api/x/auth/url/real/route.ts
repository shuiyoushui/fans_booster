import { NextRequest, NextResponse } from 'next/server';
import { XOAuthFlowManager } from '@/lib/x-oauth-flow';
import { DEFAULT_X_OAUTH_CONFIG } from '@/lib/x-oauth-flow-dev';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 生成X平台真实OAuth授权URL（绕过开发环境检测）
 * GET /api/x/auth/url/real
 */
export async function GET(request: NextRequest) {
  try {
    console.log('X OAuth Real URL generation started');
    
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      console.error('Auth validation failed:', auth.error);
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    console.log('Auth validated for user:', user.userId);
    
    // 检查是否有真实的X平台配置
    const hasRealConfig = process.env.X_CLIENT_ID && 
                         process.env.X_CLIENT_ID !== 'your-twitter-app-client-id' &&
                         process.env.X_CLIENT_SECRET &&
                         process.env.X_REDIRECT_URI;

    if (!hasRealConfig) {
      return NextResponse.json({
        success: false,
        error: 'Missing X platform configuration',
        details: {
          clientId: process.env.X_CLIENT_ID ? 'configured' : 'missing',
          clientSecret: process.env.X_CLIENT_SECRET ? 'configured' : 'missing',
          redirectUri: process.env.X_REDIRECT_URI ? 'configured' : 'missing',
          message: 'Please set X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI environment variables'
        }
      }, { status: 400 });
    }

    // 创建真实OAuth流程管理器
    const oauthManager = new XOAuthFlowManager(DEFAULT_X_OAUTH_CONFIG);
    
    console.log('Generating real X OAuth URL for user:', user.userId);
    
    // 从请求头获取token（用于传递到回调）
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // 生成真实的授权URL，传递token用于回调验证
    const { url, state } = await oauthManager.generateAuthUrl(user.userId, token);
    
    console.log('Real X OAuth URL generated successfully:', {
      urlLength: url.length,
      state: state.substring(0, 8) + '...',
      userId: user.userId,
      baseUrl: 'https://twitter.com/i/oauth2/authorize'
    });
    
    return NextResponse.json({
      success: true,
      auth_url: url,
      state: state,
      is_real_x: true,
      debug_info: {
        state_length: state.length,
        user_id: user.userId,
        generated_at: new Date().toISOString(),
        redirect_uri: DEFAULT_X_OAUTH_CONFIG.redirectUri,
        client_id: DEFAULT_X_OAUTH_CONFIG.clientId.substring(0, 8) + '...'
      }
    });

  } catch (error) {
    console.error('Generate real X OAuth URL error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate real X authorization URL',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}