import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';

/**
 * 测试OAuth回调处理（不需要认证）
 * POST /api/x/auth/test/callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    console.log('Test OAuth callback started:', {
      hasCode: !!code,
      state: state?.substring(0, 8) + '...'
    });

    if (!code || !state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing authorization code or state',
          details: { hasCode: !!code, hasState: !!state }
        },
        { status: 400 }
      );
    }

    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 处理OAuth回调，获取access token
    let tokens;
    try {
      tokens = await oauthManager.handleCallback(code, state);
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      
      // 如果是state过期错误，提供自动重试机制
      if (error instanceof Error && error.message.includes('Expired authorization URL')) {
        console.log('Detected expired state, offering automatic retry...');
        
        return NextResponse.json({
          success: false,
          error: 'Authorization URL has expired',
          auto_retry_available: true,
          details: {
            original_error: error.message,
            resolution: 'We can automatically generate a new authorization URL for you.',
            action_required: 'Please request a new authorization URL to continue.'
          }
        }, { status: 410 }); // 410 Gone - resource no longer available
      }
      
      throw error; // 重新抛出其他错误
    }
    
    return NextResponse.json({
      success: true,
      message: 'OAuth callback successful',
      tokens_info: {
        hasAccessToken: !!tokens.accessToken,
        tokenType: tokens.tokenType,
        expiresIn: tokens.expiresIn,
        hasRefreshToken: !!tokens.refreshToken
      }
    });

  } catch (error) {
    console.error('Test OAuth callback error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'OAuth callback failed',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}