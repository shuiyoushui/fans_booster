import { NextRequest, NextResponse } from 'next/server';
import { getOAuthStateStats, getDetailedOAuthStateStats, forceCleanupOAuthStates } from '@/lib/simple-oauth-state';

/**
 * OAuth状态调试端点
 * GET /api/x/auth/debug
 * POST /api/x/auth/debug (force cleanup)
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getOAuthStateStats();
    const detailedStats = getDetailedOAuthStateStats();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      basic_stats: {
        total_states: stats.total,
        valid_states: detailedStats.valid,
        expired_states: detailedStats.expired,
        corrupted_states: detailedStats.corrupted
      },
      detailed_states: stats.states.map(s => ({
        state: s.state,
        user_id: s.userId || 'anonymous',
        age_seconds: s.age,
        age_formatted: s.age < 60 ? `${s.age}s` : 
                      s.age < 3600 ? `${Math.round(s.age / 60)}m` : 
                      `${Math.round(s.age / 3600)}h`,
        valid: s.valid
      })),
      manager_info: {
        memory_states: detailedStats.total,
        cleanup_needed: detailedStats.expired + detailedStats.corrupted > 0
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'cleanup') {
      forceCleanupOAuthStates();
      
      return NextResponse.json({
        success: true,
        message: 'Force cleanup completed',
        timestamp: new Date().toISOString(),
        stats: getOAuthStateStats()
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          available_actions: ['cleanup']
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('OAuth debug POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Debug POST endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}