import { NextRequest, NextResponse } from 'next/server';
import { syncXAccount } from '@/lib/database-x-accounts';
import { SyncXAccountRequest, XSyncType } from '@/types/x-account';
import jwt from 'jsonwebtoken';

/**
 * 同步X账号数据
 * POST /api/x/accounts/[id]/sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // 验证同步类型
    const validSyncTypes: XSyncType[] = ['profile', 'followers', 'following', 'tweets', 'stats'];
    if (!syncData.sync_types || syncData.sync_types.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Sync types are required'
      }, { status: 400 });
    }

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

/**
 * 获取同步状态
 * GET /api/x/accounts/[id]/sync?sync_id=xxx
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('sync_id');

    if (!syncId) {
      return NextResponse.json({
        success: false,
        error: 'Missing sync_id parameter'
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

    // 获取同步状态
    const syncStatus = await getSyncStatus(syncId, id, userId);

    if (!syncStatus) {
      return NextResponse.json({
        success: false,
        error: 'Sync task not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: syncStatus
    });

  } catch (error) {
    console.error('Get sync status error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status'
    }, { status: 500 });
  }
}

// 辅助函数 - 需要从database模块导入
async function getSyncStatus(syncId: string, accountId: string, userId: string) {
  // 这里需要实现从数据库获取同步状态的逻辑
  // 暂时返回null，实际实现时需要从数据库查询
  return null;
}