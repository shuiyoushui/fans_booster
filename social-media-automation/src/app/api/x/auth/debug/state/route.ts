import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStateStats, getDetailedOAuthStateStats, getOAuthState } from '@/lib/simple-oauth-state';

/**
 * 专门用于调试特定state的端点
 * GET /api/x/auth/debug/state?state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    
    if (!state) {
      return NextResponse.json({
        success: false,
        error: 'Missing state parameter'
      }, { status: 400 });
    }

    console.log('Debugging specific state:', state);

    // 分析state格式
    const stateParts = state.split('_');
    let timestamp = null;
    let randomPart = null;
    
    if (stateParts.length === 2) {
      timestamp = parseInt(stateParts[0]);
      randomPart = stateParts[1];
    }

    // 尝试从状态管理器获取
    const savedState = getOAuthState(state);
    
    // 获取总体统计
    const stats = getOAuthStateStats();
    const detailedStats = getDetailedOAuthStateStats();

    const analysis = {
      input_state: state,
      format_analysis: {
        total_parts: stateParts.length,
        parts: stateParts,
        has_timestamp: timestamp !== null && !isNaN(timestamp),
        timestamp: timestamp,
        timestamp_readable: timestamp ? new Date(timestamp).toISOString() : null,
        random_part: randomPart,
        random_part_length: randomPart ? randomPart.length : 0,
        is_expired: timestamp ? (Date.now() - timestamp > 15 * 60 * 1000) : null,
        age_seconds: timestamp ? Math.round((Date.now() - timestamp) / 1000) : null
      },
      storage_result: {
        found: !!savedState,
        state_data: savedState ? {
          state: savedState.state.substring(0, 8) + '...',
          userId: savedState.userId,
          timestamp: savedState.timestamp,
          hasCodeVerifier: !!savedState.codeVerifier,
          hasCodeChallenge: !!savedState.codeChallenge,
          age_seconds: Math.round((Date.now() - savedState.timestamp) / 1000)
        } : null
      },
      current_storage_stats: {
        total_states: stats.total,
        valid_states: detailedStats.valid,
        expired_states: detailedStats.expired,
        corrupted_states: detailedStats.corrupted,
        available_states: stats.states.map(s => s.state)
      }
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis
    });
    
  } catch (error) {
    console.error('State debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'State debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}