import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { RefreshTokenRequest, RefreshTokenResponse } from '@/types/x-account';
import { updateXAccountTokens } from '@/lib/database';

/**
 * 刷新X平台access token
 * POST /api/x/auth/refresh
 */
export async function POST(request: NextRequest) {
  try {
    const body: RefreshTokenRequest = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      const response: RefreshTokenResponse = {
        success: false,
        error: 'Missing refresh token'
      };
      return NextResponse.json(response, { status: 400 });
    }

    const oauthManager = createXOAuthFlowManager();
    
    // 使用refresh token获取新的access token
    const tokens = await oauthManager.refreshAccessToken(refresh_token);

    // 如果传入了account_id，同时更新数据库中的token
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    
    if (accountId) {
      try {
        const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        
        await updateXAccountTokens(accountId, {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || refresh_token,
          token_expires_at: tokenExpiresAt,
          binding_status: 'active',
          last_error: null,
          updated_at: new Date()
        });
      } catch (dbError) {
        console.error('Failed to update tokens in database:', dbError);
        // 即使数据库更新失败，也返回新的tokens
      }
    }

    const response: RefreshTokenResponse = {
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || refresh_token,
      expires_in: tokens.expiresIn
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Token refresh error:', error);
    
    let errorMessage = 'Failed to refresh access token';
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        errorMessage = 'Refresh token is invalid or expired. Please re-authenticate.';
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'Invalid client credentials.';
      }
    }

    const response: RefreshTokenResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: 401 });
  }
}

/**
 * 刷新指定账号的token
 * POST /api/x/auth/refresh/account
 */
export async function PUT(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Missing account_id'
      }, { status: 400 });
    }

    // 获取当前用户ID进行权限验证
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    // 从数据库获取X账号信息
    const xAccount = await getXAccountById(accountId);
    if (!xAccount) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    if (!xAccount.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'No refresh token available for this account'
      }, { status: 400 });
    }

    const oauthManager = createXOAuthFlowManager();
    
    // 刷新token
    const tokens = await oauthManager.refreshAccessToken(xAccount.refresh_token);

    // 更新数据库
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    
    await updateXAccountTokens(accountId, {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || xAccount.refresh_token,
      token_expires_at: tokenExpiresAt,
      binding_status: 'active',
      last_error: null,
      updated_at: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_in: tokens.expiresIn
    });

  } catch (error) {
    console.error('Account token refresh error:', error);
    
    // 如果refresh失败，更新账号状态为expired
    const { accountId } = await request.json();
    if (accountId) {
      try {
        await updateXAccountTokens(accountId, {
          binding_status: 'expired',
          last_error: 'Token refresh failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          updated_at: new Date()
        });
      } catch (dbError) {
        console.error('Failed to update account status:', dbError);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to refresh token. Please re-authenticate with X platform.'
    }, { status: 401 });
  }
}

// 辅助函数 - 需要从database模块导入
async function getXAccountById(accountId: string) {
  // 这里需要实现从数据库获取X账号的逻辑
  // 暂时返回null，实际实现时需要从数据库查询
  return null;
}