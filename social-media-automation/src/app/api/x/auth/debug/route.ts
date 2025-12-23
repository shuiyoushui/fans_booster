import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStateStats } from '@/lib/simple-oauth-state';

/**
 * OAuth状态调试端点
 * GET /api/x/auth/debug
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getOAuthStateStats();
    
    return NextResponse.json({
      success: true,
      debug_info: {
        total_states: stats.total,
        current_time: new Date().toISOString(),
        states: stats.states.map(s => ({
          state: s.state,
          user_id: s.userId || 'anonymous',
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