import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 自动重试OAuth流程
 * POST /api/x/auth/retry
 * 当state过期时，自动生成新的授权URL
 */
export async function POST(request: NextRequest) {
  try {
    console.log('OAuth retry request started');
    
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      console.error('Auth validation failed:', auth.error);
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    const body = await request.json();
    const { expired_state } = body; // 可选的过期state信息

    console.log('OAuth retry for user:', user.userId, {
      hasExpiredState: !!expired_state,
      expiredStatePreview: expired_state?.substring(0, 8) + '...'
    });
    
    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 生成新的授权URL
    const { url, state } = await oauthManager.generateAuthUrl(user.userId);
    
    console.log('New OAuth URL generated for retry:', {
      urlLength: url.length,
      state: state.substring(0, 8) + '...',
      userId: user.userId,
      generated_at: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'New authorization URL generated successfully',
      auth_url: url,
      state: state,
      debug_info: {
        state_length: state.length,
        user_id: user.userId,
        generated_at: new Date().toISOString(),
        retry_reason: 'expired_state',
        previous_state_preview: expired_state?.substring(0, 8) + '...'
      }
    });

  } catch (error) {
    console.error('OAuth retry error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate retry authorization URL',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}