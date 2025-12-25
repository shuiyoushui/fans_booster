import { NextRequest, NextResponse } from 'next/server';

/**
 * 测试OAuth URL生成的token传递功能
 * GET /api/test/oauth-token
 */
export async function GET(request: NextRequest) {
  try {
    console.log('TEST: OAuth token transfer test started');
    
    // 获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('TEST: Token from header:', !!token);
    
    // 导入开发环境OAuth管理器
    const { XOAuthFlowManagerDev, DEFAULT_X_OAUTH_CONFIG } = await import('@/lib/x-oauth-flow-dev');
    const oauthManager = new XOAuthFlowManagerDev(DEFAULT_X_OAUTH_CONFIG);
    
    console.log('TEST: Using XOAuthFlowManagerDev directly');
    
    // 生成授权URL，强制使用开发环境，传递token
    const { url, state } = await oauthManager.generateAuthUrl('test_user', true, token);
    
    console.log('TEST: OAuth URL generated:', {
      hasTokenInUrl: url.includes('token='),
      urlLength: url.length,
      stateLength: state.length
    });
    
    // 解析URL中的token
    const urlObj = new URL(url);
    const redirectUri = urlObj.searchParams.get('redirect_uri');
    const tokenInRedirect = redirectUri ? new URL(redirectUri).searchParams.get('token') : null;
    
    return NextResponse.json({
      success: true,
      test_results: {
        original_url: url,
        redirect_uri: redirectUri,
        token_in_redirect_uri: !!tokenInRedirect,
        token_value_preview: tokenInRedirect ? tokenInRedirect.substring(0, 20) + '...' : null,
        state: state,
        token_from_header: !!token
      }
    });

  } catch (error) {
    console.error('TEST: OAuth token transfer test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error'
      },
      { status: 500 }
    );
  }
}