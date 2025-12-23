import { NextRequest, NextResponse } from 'next/server';
import { getXAccountsByUserId, getXAccountStats } from '@/lib/database-x-accounts';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 获取用户的X账号列表
 * GET /api/x/accounts
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as any;

    const result = await getXAccountsByUserId(user.userId, {
      page,
      limit,
      status
    });

    return NextResponse.json({
      success: true,
      accounts: result.accounts,
      total: result.total,
      page,
      limit
    });

  } catch (error) {
    console.error('Get X accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get X accounts'
      },
      { status: 500 }
    );
  }
}