import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { GenerateAuthUrlRequest, GenerateAuthUrlResponse } from '@/types/x-account';

/**
 * 生成X平台OAuth授权URL
 * GET /api/x/auth/url
 */
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri');
    const scopesParam = searchParams.get('scopes');
    const customState = searchParams.get('state');

    // 解析scopes
    let scopes: string[] = [];
    if (scopesParam) {
      scopes = scopesParam.split(',').map(s => s.trim()).filter(Boolean);
    }

    // 获取当前用户ID（从JWT token中获取）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // 创建OAuth管理器
    const oauthManager = createXOAuthFlowManager({
      redirectUri: redirectUri || undefined,
      scopes: scopes.length > 0 ? scopes : undefined
    });

    // 生成授权URL
    const { url, state } = await oauthManager.generateAuthUrl(userId);

    const response: GenerateAuthUrlResponse = {
      success: true,
      auth_url: url,
      state: state
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Generate auth URL error:', error);
    
    const response: GenerateAuthUrlResponse = {
      success: false,
      error: 'Failed to generate authorization URL'
    };

    return NextResponse.json(response, { status: 500 });
  }
}