import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { GenerateAuthUrlRequest, GenerateAuthUrlResponse } from '@/types/x-account';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 生成X平台OAuth授权URL
 * GET /api/x/auth/url
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

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

    // 创建OAuth管理器
    const oauthManager = createXOAuthFlowManager({
      redirectUri: redirectUri || undefined,
      scopes: scopes.length > 0 ? scopes : undefined
    });

    // 确保scopes不为空
    if (scopes.length > 0) {
      // 如果有自定义scopes，使用它们
    } else {
      // 使用默认scopes
    }

    // 生成授权URL
    const { url, state } = await oauthManager.generateAuthUrl(user.userId);

    // 调试日志
    console.log('Generated OAuth URL:', {
      url: url.replace(/code_challenge=[^&]+/, 'code_challenge=...'),
      clientId: process.env.X_CLIENT_ID?.substring(0, 15) + '...',
      redirectUri: process.env.X_REDIRECT_URI
    });

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