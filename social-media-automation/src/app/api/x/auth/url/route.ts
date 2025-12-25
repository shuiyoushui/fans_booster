import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow-dev';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 生成X平台OAuth授权URL
 * GET /api/x/auth/url
 */
export async function GET(request: NextRequest) {
  try {
    console.log('X OAuth URL generation started');
    
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      console.error('Auth validation failed:', auth.error);
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    console.log('Auth validated for user:', user.userId);
    
    // 从请求头获取token（用于传递到回调）
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    // 创建OAuth流程管理器 - 强制使用开发环境以测试token传递
    const { XOAuthFlowManagerDev, DEFAULT_X_OAUTH_CONFIG } = await import('@/lib/x-oauth-flow-dev');
    const oauthManager = new XOAuthFlowManagerDev(DEFAULT_X_OAUTH_CONFIG);
    
    console.log('Generating OAuth URL for user:', user.userId, 'with token:', !!token);
    
    // 生成授权URL，传递token用于回调验证
    const { url, state } = await oauthManager.generateAuthUrl(user.userId, true, token);
    
    console.log('OAuth URL generated successfully:', {
      urlLength: url.length,
      state: state.substring(0, 8) + '...',
      userId: user.userId
    });
    
    // 将state存储到session或数据库中（这里简化处理，实际应该持久化）
    // 在实际应用中，建议将state存储到Redis或数据库中，并设置过期时间
    
    return NextResponse.json({
      success: true,
      auth_url: url,
      state: state,
      debug_info: {
        state_length: state.length,
        user_id: user.userId,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generate X OAuth URL error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate authorization URL',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}