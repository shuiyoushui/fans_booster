import { NextRequest, NextResponse } from 'next/server';
import { getXAccountById, deleteXAccount } from '@/lib/database-x-accounts';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 删除X账号绑定
 * DELETE /api/x/accounts/[id]
 */
export async function DELETE(
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

    // 删除账号
    await deleteXAccount(accountId, user.userId);

    return NextResponse.json({
      success: true,
      message: 'X账号删除成功'
    });

  } catch (error) {
    console.error('Delete X account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete X account'
      },
      { status: 500 }
    );
  }
}