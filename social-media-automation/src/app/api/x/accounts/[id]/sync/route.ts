import { NextRequest, NextResponse } from 'next/server';
import { getXAccountById, syncXAccount } from '@/lib/database-x-accounts';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 同步X账号数据
 * POST /api/x/accounts/[id]/sync
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    const { id: accountId } = await context.params;
    const body = await request.json();
    
    const { sync_types, force_sync = false } = body;

    // 检查账号是否存在且属于当前用户
    const account = await getXAccountById(accountId, user.userId);
    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found or permission denied'
        },
        { status: 404 }
      );
    }

    // 启动同步任务
    const syncId = await syncXAccount(accountId, {
      sync_types: sync_types || ['profile', 'followers', 'following'],
      force_sync,
      user_id: user.userId
    });

    return NextResponse.json({
      success: true,
      sync_id: syncId,
      message: '同步任务已启动'
    });

  } catch (error) {
    console.error('Sync X account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync X account'
      },
      { status: 500 }
    );
  }
}