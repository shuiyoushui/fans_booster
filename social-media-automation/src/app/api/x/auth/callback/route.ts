import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { getXAccountByXUserId, createXAccount, updateUserXAccountRelation } from '@/lib/database-x-accounts';
import { HandleOAuthCallbackRequest, BindXAccountResponse, DEFAULT_AUTO_GROW_SETTINGS } from '@/types/x-account';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 处理X平台OAuth回调
 * POST /api/x/auth/callback
 */
export async function POST(request: NextRequest) {
  try {
    const body: HandleOAuthCallbackRequest = await request.json();
    const { code, state, user_preferences = {} } = body;

    if (!code || !state) {
      const response: BindXAccountResponse = {
        success: false,
        error: 'Missing required parameters: code and state'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      const response: BindXAccountResponse = {
        success: false,
        error: auth.error.error || 'Authentication failed'
      };
      return NextResponse.json(response, { status: auth.status });
    }

    const { user } = auth;

    // 创建OAuth管理器
    const oauthManager = createXOAuthFlowManager();

    // 处理回调，获取tokens
    const tokens = await oauthManager.handleCallback(code, state);

    // 获取用户信息
    const userInfo = await oauthManager.getUserInfo(tokens.accessToken);

    // 检查该X账号是否已经被其他用户绑定
    const existingAccount = await getXAccountByXUserId(userInfo.id);
    if (existingAccount && existingAccount.user_id !== user.userId) {
      const response: BindXAccountResponse = {
        success: false,
        error: 'This X account is already bound to another user'
      };
      return NextResponse.json(response, { status: 409 });
    }

    // 如果账号已存在，更新tokens和信息
    if (existingAccount && existingAccount.user_id === user.userId) {
      // 更新access token和refresh token
      const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      
      await updateUserXAccountRelation(existingAccount.id, {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokenExpiresAt,
        scope: tokens.scope,
        binding_status: 'active',
        last_sync_at: new Date(),
        last_error: undefined,
        username: userInfo.username,
        display_name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        bio: userInfo.description,
        location: userInfo.location,
        verified: userInfo.verified,
        followers_count: userInfo.public_metrics.followers_count,
        following_count: userInfo.public_metrics.following_count,
        tweets_count: userInfo.public_metrics.tweet_count,
        listed_count: userInfo.public_metrics.listed_count,
        auto_grow_enabled: user_preferences.auto_grow_enabled ?? false,
        auto_grow_settings: user_preferences.auto_grow_settings ?? DEFAULT_AUTO_GROW_SETTINGS,
        updated_at: new Date()
      });

      const response: BindXAccountResponse = {
        success: true,
        account: {
          id: existingAccount.id,
          username: existingAccount.username,
          display_name: existingAccount.display_name,
          avatar_url: existingAccount.avatar_url,
          verified: existingAccount.verified,
          followers_count: existingAccount.followers_count,
          following_count: existingAccount.following_count,
          tweets_count: existingAccount.tweets_count,
          binding_status: 'active',
          is_active: existingAccount.is_active,
          is_primary: existingAccount.is_primary,
          last_sync_at: new Date().toISOString(),
          auto_grow_enabled: existingAccount.auto_grow_enabled,
          created_at: existingAccount.created_at.toISOString()
        },
        message: 'X account reconnected successfully'
      };

      return NextResponse.json(response);
    }

    // 创建新的X账号绑定记录
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    
    const xAccountData = {
      user_id: user.userId,
      x_user_id: userInfo.id,
      username: userInfo.username,
      display_name: userInfo.name,
      email: userInfo.email,
      avatar_url: userInfo.avatar_url,
      bio: userInfo.description,
      location: userInfo.location,
      verified: userInfo.verified,
      followers_count: userInfo.public_metrics.followers_count,
      following_count: userInfo.public_metrics.following_count,
      tweets_count: userInfo.public_metrics.tweet_count,
      listed_count: userInfo.public_metrics.listed_count,
      account_created_at: new Date(userInfo.created_at),
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokenExpiresAt,
      scope: tokens.scope,
      is_active: true,
      is_primary: user_preferences.is_primary ?? false,
      binding_status: 'active' as const,
      last_sync_at: new Date(),
      auto_grow_enabled: user_preferences.auto_grow_enabled ?? false,
      auto_grow_settings: user_preferences.auto_grow_settings ?? DEFAULT_AUTO_GROW_SETTINGS
    };

    const newAccount = await createXAccount(xAccountData);

    const response: BindXAccountResponse = {
      success: true,
      account: {
        id: newAccount.id,
        username: newAccount.username,
        display_name: newAccount.display_name,
        avatar_url: newAccount.avatar_url,
        verified: newAccount.verified,
        followers_count: newAccount.followers_count,
        following_count: newAccount.following_count,
        tweets_count: newAccount.tweets_count,
        binding_status: newAccount.binding_status,
        is_active: newAccount.is_active,
        is_primary: newAccount.is_primary,
        last_sync_at: newAccount.last_sync_at?.toISOString(),
        auto_grow_enabled: newAccount.auto_grow_enabled,
        created_at: newAccount.created_at.toISOString()
      },
      message: 'X account bound successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    let errorMessage = 'Failed to bind X account';
    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired state')) {
        errorMessage = 'Authorization session expired. Please try again.';
      } else if (error.message.includes('Token exchange failed')) {
        errorMessage = 'Failed to exchange authorization code. Please try again.';
      } else if (error.message.includes('Failed to get user info')) {
        errorMessage = 'Failed to retrieve user information from X platform.';
      }
    }

    const response: BindXAccountResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: 500 });
  }
}