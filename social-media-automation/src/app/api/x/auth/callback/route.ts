import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { createXAPIClient } from '@/lib/x-api-client';
import { requireAuth } from '@/lib/auth-helpers';
import { createXAccount } from '@/lib/database-x-accounts';

/**
 * 处理X平台OAuth回调
 * POST /api/x/auth/callback
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    const body = await request.json();
    const { code, state } = body;

    if (!code || !state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing authorization code or state'
        },
        { status: 400 }
      );
    }

    // 创建OAuth流程管理器
    const oauthManager = createXOAuthFlowManager();
    
    // 处理OAuth回调，获取access token
    const tokens = await oauthManager.handleCallback(code, state);
    
    // 创建X API客户端
    const xApiClient = createXAPIClient(tokens.accessToken);
    
    // 获取用户信息
    const userInfo = await xApiClient.getUserInfo();
    
    // 获取用户详细指标数据
    const metrics = await xApiClient.getUserMetrics(userInfo.id);
    
    // 创建X账号记录
    const xAccount = await createXAccount({
      user_id: user.userId,
      x_user_id: userInfo.id,
      username: userInfo.username,
      display_name: userInfo.name,
      avatar_url: userInfo.profile_image_url,
      verified: userInfo.verified,
      bio: userInfo.description,
      location: userInfo.location,
      website: userInfo.url,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000),
      binding_status: 'active',
      followers_count: metrics.followers_count,
      following_count: metrics.following_count,
      tweets_count: metrics.tweet_count,
      listed_count: metrics.listed_count,
      last_sync_at: new Date(),
      is_active: true,
      is_primary: false, // 默认不是主账号，可以根据业务逻辑调整
      auto_grow_enabled: false
    });

    return NextResponse.json({
      success: true,
      account: {
        id: xAccount.id,
        x_user_id: xAccount.x_user_id,
        username: xAccount.username,
        display_name: xAccount.display_name,
        avatar_url: xAccount.avatar_url,
        verified: xAccount.verified,
        followers_count: xAccount.followers_count,
        following_count: xAccount.following_count,
        tweets_count: xAccount.tweet_count,
        binding_status: xAccount.binding_status,
        is_primary: xAccount.is_primary,
        last_sync_at: xAccount.last_sync_at,
        created_at: xAccount.created_at
      }
    });

  } catch (error) {
    console.error('X OAuth callback error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed'
      },
      { status: 500 }
    );
  }
}