import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { ValidateTokenRequest, ValidateTokenResponse } from '@/types/x-account';
import { requireAuth } from '@/lib/auth-helpers';
import { getXAccountById } from '@/lib/database-x-accounts';

/**
 * 验证X平台access token
 * POST /api/x/auth/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidateTokenRequest = await request.json();
    const { access_token } = body;

    if (!access_token) {
      const response: ValidateTokenResponse = {
        valid: false,
        error: 'Missing access token'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const oauthManager = createXOAuthFlowManager();
    
    // 验证token是否有效
    const isValid = await oauthManager.validateToken(access_token);
    
    if (!isValid) {
      const response: ValidateTokenResponse = {
        valid: false,
        error: 'Invalid or expired access token'
      };
      return NextResponse.json(response);
    }

    // 如果token有效，获取用户信息
    try {
      const userInfo = await oauthManager.getUserInfo(access_token);
      
      const response: ValidateTokenResponse = {
        valid: true,
        user_info: userInfo
      };

      return NextResponse.json(response);

    } catch (error) {
      // Token有效但获取用户信息失败
      const response: ValidateTokenResponse = {
        valid: true,
        error: 'Token is valid but failed to fetch user info'
      };
      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    console.error('Token validation error:', error);
    
    const response: ValidateTokenResponse = {
      valid: false,
      error: 'Token validation failed'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 检查指定X账号的token状态
 * GET /api/x/auth/validate?account_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing account_id parameter'
      }, { status: 400 });
    }

    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

    // 从数据库获取X账号信息
    const xAccount = await getXAccountById(accountId, user.userId);
    if (!xAccount) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    // 检查token是否过期
    const now = new Date();
    const isExpired = xAccount?.token_expires_at && new Date(xAccount.token_expires_at) < now;

    if (isExpired) {
      return NextResponse.json({
        success: true,
        valid: false,
        expired: true,
        message: 'Token has expired'
      });
    }

    // 验证token
    const oauthManager = createXOAuthFlowManager();
    const isValid = await oauthManager.validateToken(xAccount.access_token);

    return NextResponse.json({
      success: true,
      valid: isValid,
      expired: false,
      user_info: isValid ? {
        id: xAccount.x_user_id,
        username: xAccount.username,
        name: xAccount.display_name,
        avatar_url: xAccount.avatar_url,
        verified: xAccount.verified,
        public_metrics: {
          followers_count: xAccount.followers_count,
          following_count: xAccount.following_count,
          tweet_count: xAccount.tweets_count,
          listed_count: xAccount.listed_count
        }
      } : undefined
    });

  } catch (error) {
    console.error('Account validation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Account validation failed'
    }, { status: 500 });
  }
}