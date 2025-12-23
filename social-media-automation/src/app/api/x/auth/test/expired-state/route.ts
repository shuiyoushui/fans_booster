import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';

/**
 * 测试端点：模拟过期state的回调
 * POST /api/x/auth/test/expired-state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state } = body;
    
    if (!state) {
      return NextResponse.json({
        success: false,
        error: 'Missing state parameter'
      }, { status: 400 });
    }
    
    console.log('Testing expired state callback:', state);
    
    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 使用假的授权码和过期的state进行测试
    try {
      const tokens = await oauthManager.handleCallback('fake_authorization_code', state);
      return NextResponse.json({
        success: false,
        error: 'Should have failed with expired state',
        tokens
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        message: 'Expected error caught',
        error: error instanceof Error ? error.message : 'Unknown error',
        state_tested: state
      });
    }
    
  } catch (error) {
    console.error('Test expired state error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}