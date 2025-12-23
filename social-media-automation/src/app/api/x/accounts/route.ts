import { NextRequest, NextResponse } from 'next/server';
import { getXAccountsByUserId, getXAccountStats, updateXAccountsByCondition } from '@/lib/database-x-accounts';
import { XAccountListResponse, XAccountStats } from '@/types/x-account';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 获取用户的X账号列表
 * GET /api/x/accounts?page=1&limit=10&status=active
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as any;

    // 验证分页参数
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({
        success: false,
        error: 'Invalid pagination parameters'
      }, { status: 400 });
    }

    // 获取X账号列表
    const { accounts, total } = await getXAccountsByUserId(user.userId, {
      page,
      limit,
      status
    });

    const response: XAccountListResponse = {
      success: true,
      accounts: accounts.map(account => ({
        id: account.id,
        username: account.username,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
        verified: account.verified,
        followers_count: account.followers_count,
        following_count: account.following_count,
        tweets_count: account.tweets_count,
        binding_status: account.binding_status,
        is_active: account.is_active,
        is_primary: account.is_primary,
        last_sync_at: account.last_sync_at ? String(account.last_sync_at) : undefined,
        auto_grow_enabled: account.auto_grow_enabled,
        created_at: String(account.created_at)
      })),
      total,
      page,
      limit
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get X accounts error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch X accounts'
    }, { status: 500 });
  }
}

/**
 * 获取X账号统计数据
 * GET /api/x/accounts/stats
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

    // 获取统计数据
    const stats = await getXAccountStats(user.userId);

    const response: XAccountStats = {
      total_accounts: stats.total_accounts,
      active_accounts: stats.active_accounts,
      primary_accounts: stats.primary_accounts,
      total_followers: stats.total_followers,
      total_following: stats.total_following,
      total_tweets: stats.total_tweets,
      accounts_by_status: stats.accounts_by_status,
      accounts_growth_today: stats.accounts_growth_today,
      sync_success_rate: stats.sync_success_rate,
      last_sync_time: stats.last_sync_time ? String(stats.last_sync_time) : undefined
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get X account stats error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch X account statistics'
    }, { status: 500 });
  }
}