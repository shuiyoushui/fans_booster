import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';

/**
 * 测试端点：生成OAuth URL（不需要认证）
 * GET /api/x/auth/test/url
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Test OAuth URL generation started');
    
    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 生成授权URL（不使用用户ID进行测试）
    const { url, state } = await oauthManager.generateAuthUrl('test_user_123');
    
    console.log('Test OAuth URL generated successfully:', {
      urlLength: url.length,
      state: state.substring(0, 8) + '...',
      userId: 'test_user_123'
    });
    
    return NextResponse.json({
      success: true,
      auth_url: url,
      state: state,
      debug_info: {
        state_length: state.length,
        user_id: 'test_user_123',
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test OAuth URL generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate test authorization URL',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}