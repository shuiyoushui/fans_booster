import { NextRequest, NextResponse } from 'next/server';
import { getXAccountStats } from '@/lib/database-x-accounts';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 获取X账号统计数据
 * GET /api/x/accounts/stats
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

    const stats = await getXAccountStats(user.userId);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get X account stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get X account stats'
      },
      { status: 500 }
    );
  }
}