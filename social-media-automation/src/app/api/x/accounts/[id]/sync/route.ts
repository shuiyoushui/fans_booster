import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getXAccountById, updateXAccount } from '@/lib/database-x-accounts';
import { createXAPIClient, xAPIUsageMonitor } from '@/lib/x-api-client';

interface SyncRequest {
  sync_types?: string[];
  force_sync?: boolean;
}

/**
 * 同步X账号数据
 * POST /api/x/accounts/[id]/sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const auth = requireAuth(request);
    if ('error' in auth) {
      return NextResponse.json(auth.error, { status: auth.status });
    }

    const { user } = auth;
    const { id } = await params;
    const body: SyncRequest = await request.json();
    
    const { sync_types = ['profile', 'metrics'], force_sync = false } = body;

    // 获取X账号记录
    const xAccount = await getXAccountById(id);
    
    if (!xAccount) {
      return NextResponse.json(
        {
          success: false,
          error: 'X账号不存在'
        },
        { status: 404 }
      );
    }

    // 检查账号归属
    if (xAccount.user_id !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: '无权限访问此账号'
        },
        { status: 403 }
      );
    }

    // 检查token是否过期
    if (xAccount.token_expires_at && xAccount.token_expires_at < new Date()) {
      // 尝试刷新token（如果有refresh_token）
      if (xAccount.refresh_token) {
        try {
          const refreshedTokens = await refreshAccessToken(xAccount.refresh_token);
          await updateXAccount(id, {
            access_token: refreshedTokens.accessToken,
            refresh_token: refreshedTokens.refreshToken,
            token_expires_at: new Date(Date.now() + refreshedTokens.expiresIn * 1000)
          });
          xAccount.access_token = refreshedTokens.accessToken;
        } catch (refreshError) {
          return NextResponse.json(
            {
              success: false,
              error: 'Access token expired and refresh failed',
              requires_reauth: true
            },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Access token expired',
            requires_reauth: true
          },
          { status: 401 }
        );
      }
    }

    // 创建X API客户端
    const xApiClient = createXAPIClient(xAccount.access_token!);

    // 检查API使用限制
    if (!xAPIUsageMonitor.canMakeRequest('/users/me')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API rate limit exceeded, please try again later',
          retry_after: '15 minutes'
        },
        { status: 429 }
      );
    }

    const syncResults: any = {};

    try {
      // 同步基本信息
      if (sync_types.includes('profile')) {
        const userInfo = await xApiClient.getUserInfo();
        
        await updateXAccount(id, {
          display_name: userInfo.name,
          avatar_url: userInfo.profile_image_url,
          verified: userInfo.verified,
          bio: userInfo.description,
          location: userInfo.location,
          website: userInfo.url
        });

        syncResults.profile = {
          success: true,
          data: {
            display_name: userInfo.name,
            followers_count: userInfo.public_metrics.followers_count,
            following_count: userInfo.public_metrics.following_count,
            tweets_count: userInfo.public_metrics.tweet_count,
            listed_count: userInfo.public_metrics.listed_count
          }
        };
      }

      // 同步详细指标数据
      if (sync_types.includes('metrics')) {
        const metrics = await xApiClient.getUserMetrics(xAccount.x_user_id);
        
        await updateXAccount(id, {
          followers_count: metrics.followers_count,
          following_count: metrics.following_count,
          tweets_count: metrics.tweet_count,
          listed_count: metrics.listed_count,
          last_sync_at: new Date()
        });

        syncResults.metrics = {
          success: true,
          data: {
            ...metrics,
            engagement_rate: metrics.recent_metrics.engagement_rate,
            follower_growth_7d: metrics.follower_growth.new_followers_7d,
            follower_growth_30d: metrics.follower_growth.new_followers_30d
          }
        };
      }

      // 同步关注者数据（可选，因为API限制较严格）
      if (sync_types.includes('followers')) {
        try {
          const followers = await xApiClient.getUserFollowers(xAccount.x_user_id, 100);
          
          // 这里可以将关注者数据存储到单独的表中
          // 简化处理，只更新关注者数量
          syncResults.followers = {
            success: true,
            count: followers.length,
            sample: followers.slice(0, 5) // 返回前5个作为示例
          };
        } catch (followerError) {
          console.error('Sync followers error:', followerError);
          syncResults.followers = {
            success: false,
            error: 'Failed to sync followers data'
          };
        }
      }

      // 同步关注的人数据（可选）
      if (sync_types.includes('following')) {
        try {
          const following = await xApiClient.getUserFollowing(xAccount.x_user_id, 100);
          
          syncResults.following = {
            success: true,
            count: following.length,
            sample: following.slice(0, 5) // 返回前5个作为示例
          };
        } catch (followingError) {
          console.error('Sync following error:', followingError);
          syncResults.following = {
            success: false,
            error: 'Failed to sync following data'
          };
        }
      }

      // 记录API使用量
      xAPIUsageMonitor.recordRequest('/users/me');

      return NextResponse.json({
        success: true,
        message: '账号数据同步成功',
        sync_results: syncResults,
        synced_at: new Date().toISOString()
      });

    } catch (apiError) {
      console.error('X API sync error:', apiError);
      
      return NextResponse.json(
        {
          success: false,
          error: apiError instanceof Error ? apiError.message : 'API同步失败',
          sync_results: syncResults
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Sync X account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync X account'
      },
      { status: 500 }
    );
  }
}

/**
 * 刷新访问令牌
 */
async function refreshAccessToken(refreshToken: string) {
  const { createXOAuthFlowManager } = await import('@/lib/x-oauth-flow');
  const oauthManager = createXOAuthFlowManager();
  
  return await oauthManager.refreshAccessToken(refreshToken);
}