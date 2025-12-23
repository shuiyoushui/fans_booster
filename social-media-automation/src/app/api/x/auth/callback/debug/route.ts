import { NextRequest, NextResponse } from 'next/server';
import { getOAuthState, getOAuthStateStats } from '@/lib/simple-oauth-state';

/**
 * OAuth回调调试端点
 * POST /api/x/auth/callback/debug
 * 用于分析实际收到的回调参数
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    console.log('=== OAuth Callback Debug ===');
    console.log('Received parameters:', {
      hasCode: !!code,
      hasState: !!state,
      codeLength: code?.length || 0,
      stateLength: state?.length || 0,
      statePreview: state?.substring(0, 16) + '...',
      timestamp: new Date().toISOString()
    });

    // 分析state格式
    let stateAnalysis = null;
    if (state) {
      const stateParts = state.split('_');
      let timestamp = null;
      
      if (stateParts.length === 2) {
        timestamp = parseInt(stateParts[0]);
      }

      stateAnalysis = {
        input_state: state,
        total_parts: stateParts.length,
        parts: stateParts,
        has_timestamp: timestamp !== null && !isNaN(timestamp),
        timestamp: timestamp,
        timestamp_readable: timestamp ? new Date(timestamp).toISOString() : null,
        random_part: stateParts.length > 1 ? stateParts[1] : null,
        random_part_length: stateParts.length > 1 ? stateParts[1].length : 0,
        is_expired: timestamp ? (Date.now() - timestamp > 15 * 60 * 1000) : null,
        age_seconds: timestamp ? Math.round((Date.now() - timestamp) / 1000) : null
      };
    }

    // 检查状态管理器
    const stats = getOAuthStateStats();
    const foundState = state ? getOAuthState(state) : null;

    const debugInfo = {
      request_analysis: {
        has_code: !!code,
        has_state: !!state,
        code_length: code?.length || 0,
        state_length: state?.length || 0,
        state_preview: state?.substring(0, 16) + '...'
      },
      state_analysis: stateAnalysis,
      storage_status: {
        total_states: stats.total,
        available_state_previews: stats.states.map(s => s.state),
        found_in_storage: !!foundState,
        found_state_data: foundState ? {
          state: foundState.state.substring(0, 8) + '...',
          userId: foundState.userId,
          timestamp: foundState.timestamp,
          hasCodeVerifier: !!foundState.codeVerifier,
          hasCodeChallenge: !!foundState.codeChallenge,
          age_seconds: Math.round((Date.now() - foundState.timestamp) / 1000)
        } : null
      },
      environment: {
        current_time: new Date().toISOString(),
        current_timestamp: Date.now()
      }
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('OAuth callback debug error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}