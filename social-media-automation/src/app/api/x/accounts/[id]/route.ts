import { NextRequest, NextResponse } from 'next/server';
import { 
  getXAccountById, 
  updateXAccount, 
  deleteXAccount,
  updateXAccountsByCondition
} from '@/lib/database-x-accounts';
import { 
  XAccountDetailResponse, 
  UpdateXAccountRequest, 
  UnbindXAccountRequest,
  DEFAULT_AUTO_GROW_SETTINGS,
  XAutoGrowSettings
} from '@/types/x-account';
import { requireAuth } from '@/lib/auth-helpers';

/**
 * 获取X账号详细信息
 * GET /api/x/accounts/[id]
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      const response: XAccountDetailResponse = {
        success: false,
        error: auth.error.error || 'Authentication failed'
      };
      return NextResponse.json(response, { status: auth.status });
    }

    const { user } = auth;

    // 获取X账号详情
    const account = await getXAccountById(id, user.userId);
    if (!account) {
      const response: XAccountDetailResponse = {
        success: false,
        error: 'X account not found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: XAccountDetailResponse = {
      success: true,
      account: {
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
        last_sync_at: account.last_sync_at?.toISOString(),
        auto_grow_enabled: account.auto_grow_enabled,
        created_at: account.created_at.toISOString(),
        bio: account.bio,
        location: account.location,
        website: account.website,
        email: account.email,
        listed_count: account.listed_count,
        account_created_at: account.account_created_at.toISOString(),
        token_expires_at: account.token_expires_at?.toISOString(),
        scope: account.scope,
        last_error: account.last_error,
        auto_grow_settings: account.auto_grow_settings,
        activities: (account.activities || []).map(activity => ({
          ...activity,
          created_at: activity.created_at instanceof Date 
            ? activity.created_at.toISOString() 
            : activity.created_at
        })),
        sync_logs: (account.sync_logs || []).map(log => ({
          ...log,
          started_at: log.started_at instanceof Date 
            ? log.started_at.toISOString() 
            : log.started_at,
          completed_at: log.completed_at instanceof Date 
            ? log.completed_at.toISOString() 
            : log.completed_at
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get X account detail error:', error);
    
    const response: XAccountDetailResponse = {
      success: false,
      error: 'Failed to fetch X account details'
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 更新X账号信息
 * PUT /api/x/accounts/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData: UpdateXAccountRequest = await request.json();

    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

    // 检查账号是否存在且属于当前用户
    const existingAccount = await getXAccountById(id, user.userId);
    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    // 如果设置为主账号，需要先取消其他账号的主账号状态
    if (updateData.is_primary) {
      await updateXAccountsByCondition(
        { is_primary: false },
        { user_id: user.userId, is_primary: true }
      );
    }

    // 更新账号信息
    const updateDataForAccount = {
      ...updateData,
      auto_grow_settings: updateData.auto_grow_settings 
        ? { ...DEFAULT_AUTO_GROW_SETTINGS, ...updateData.auto_grow_settings } as XAutoGrowSettings
        : undefined
    };
    const updatedAccount = await updateXAccount(id, updateDataForAccount);

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        username: updatedAccount.username,
        display_name: updatedAccount.display_name,
        avatar_url: updatedAccount.avatar_url,
        verified: updatedAccount.verified,
        followers_count: updatedAccount.followers_count,
        following_count: updatedAccount.following_count,
        tweets_count: updatedAccount.tweets_count,
        binding_status: updatedAccount.binding_status,
        is_active: updatedAccount.is_active,
        is_primary: updatedAccount.is_primary,
        last_sync_at: updatedAccount.last_sync_at?.toISOString(),
        auto_grow_enabled: updatedAccount.auto_grow_enabled,
        created_at: updatedAccount.created_at.toISOString()
      },
      message: 'X account updated successfully'
    });

  } catch (error) {
    console.error('Update X account error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update X account'
    }, { status: 500 });
  }
}

/**
 * 删除X账号绑定
 * DELETE /api/x/accounts/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取确认信息（从查询参数或请求体）
    const { searchParams } = new URL(request.url);
    const confirmUsername = searchParams.get('confirm_username');
    
    let bodyConfirmUsername: string | undefined;
    try {
      const body = await request.json();
      bodyConfirmUsername = body.confirm_username;
    } catch {
      // 请求体可能为空
    }

    const finalConfirmUsername = confirmUsername || bodyConfirmUsername;

    if (!finalConfirmUsername) {
      return NextResponse.json({
        success: false,
        error: 'Missing confirm_username parameter'
      }, { status: 400 });
    }

    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;

    // 获取账号信息进行确认
    const account = await getXAccountById(id, user.userId);
    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    // 验证用户名确认
    if (account.username !== finalConfirmUsername) {
      return NextResponse.json({
        success: false,
        error: 'Username confirmation does not match'
      }, { status: 400 });
    }

    // 删除账号
    await deleteXAccount(id, user.userId);

    return NextResponse.json({
      success: true,
      message: 'X account unbound successfully'
    });

  } catch (error) {
    console.error('Delete X account error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to unbind X account'
    }, { status: 500 });
  }
}