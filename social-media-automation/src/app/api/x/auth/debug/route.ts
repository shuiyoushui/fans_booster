import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStateCount, getAllOAuthStates, checkOAuthStateExists } from '@/lib/database-oauth-states';

/**
 * OAuth状态调试端点
 * GET /api/x/auth/debug
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    
    if (state) {
      // 检查特定状态
      const exists = checkOAuthStateExists(state);
      return NextResponse.json({
        success: true,
        state_check: {
          state: state.substring(0, 8) + '...',
          exists: exists
        }
      });
    }
    
    // 获取所有状态信息
    const count = getOAuthStateCount();
    const states = getAllOAuthStates();
    
    return NextResponse.json({
      success: true,
      debug_info: {
        total_states: count,
        current_time: new Date().toISOString(),
        states: states.map(s => ({
          state: s.state.substring(0, 8) + '...',
          user_id: s.user_id || 'anonymous',
          age_seconds: s.age,
          age_formatted: s.age < 60 ? `${s.age}s` : 
                        s.age < 3600 ? `${Math.round(s.age / 60)}m` : 
                        `${Math.round(s.age / 3600)}h`,
          expired: s.age > 900 // 15 minutes
        }))
      }
    });
    
  } catch (error) {
    console.error('OAuth debug error:', error);
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