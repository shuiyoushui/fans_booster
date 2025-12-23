import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
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
    
    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 生成授权URL
    const { url, state } = await oauthManager.generateAuthUrl(user.userId);
    
    // 将state存储到session或数据库中（这里简化处理，实际应该持久化）
    // 在实际应用中，建议将state存储到Redis或数据库中，并设置过期时间
    
    return NextResponse.json({
      success: true,
      auth_url: url,
      state: state
    });

  } catch (error) {
    console.error('Generate X OAuth URL error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate authorization URL'
      },
      { status: 500 }
    );
  }
}