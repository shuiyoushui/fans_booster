import { NextRequest, NextResponse } from 'next/server';
import { 
  getXAccountById, 
  updateXAccount, 
  deleteXAccount,
  syncXAccount
} from '@/lib/database-x-accounts';
import { 
  XAccountDetailResponse, 
  UpdateXAccountRequest, 
  UnbindXAccountRequest,
  SyncXAccountRequest,
  XSyncType
} from '@/types/x-account';
import jwt from 'jsonwebtoken';

/**
 * 获取X账号详细信息
 * GET /api/x/accounts/[id]
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 获取当前用户ID
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      const response: XAccountDetailResponse = {
        success: false,
        error: 'User not authenticated'
      };
      return NextResponse.json(response, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      const response: XAccountDetailResponse = {
        success: false,
        error: 'Invalid authentication token'
      };
      return NextResponse.json(response, { status: 401 });
    }

    // 获取X账号详情
    const account = await getXAccountById(id, userId);
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
        activities: account.activities || [],
        sync_logs: account.sync_logs || []
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updateData: UpdateXAccountRequest = await request.json();

    // 获取当前用户ID
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 });
    }

    // 检查账号是否存在且属于当前用户
    const existingAccount = await getXAccountById(id, userId);
    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    // 如果设置为主账号，需要先取消其他账号的主账号状态
    if (updateData.is_primary) {
      await updateXAccount(
        { is_primary: false },
        { user_id: userId, is_primary: true }
      );
    }

    // 更新账号信息
    const updatedAccount = await updateXAccount(id, updateData);

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // 获取当前用户ID
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 });
    }

    // 获取账号信息进行确认
    const account = await getXAccountById(id, userId);
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
    await deleteXAccount(id, userId);

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

/**
 * 同步X账号数据
 * POST /api/x/accounts/[id]/sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const syncData: SyncXAccountRequest = await request.json();

    // 获取当前用户ID
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token'
      }, { status: 401 });
    }

    // 检查账号是否存在且属于当前用户
    const account = await getXAccountById(id, userId);
    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'X account not found'
      }, { status: 404 });
    }

    // 验证同步类型
    const validSyncTypes: XSyncType[] = ['profile', 'followers', 'following', 'tweets', 'stats'];
    const invalidTypes = syncData.sync_types.filter(type => !validSyncTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Invalid sync types: ${invalidTypes.join(', ')}`
      }, { status: 400 });
    }

    // 启动同步任务
    const syncId = await syncXAccount(id, {
      sync_types: syncData.sync_types,
      force_sync: syncData.force_sync || false,
      user_id: userId
    });

    return NextResponse.json({
      success: true,
      sync_id: syncId,
      message: 'Sync task started successfully'
    });

  } catch (error) {
    console.error('Sync X account error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start sync task'
    }, { status: 500 });
  }
}