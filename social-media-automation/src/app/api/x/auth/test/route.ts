import { NextRequest, NextResponse } from 'next/server';
import { createXOAuthFlowManager } from '@/lib/x-oauth-flow';
import { getOAuthStateStats, getDetailedOAuthStateStats, getOAuthState, forceCleanupOAuthStates } from '@/lib/simple-oauth-state';

/**
 * OAuth流程测试端点
 * POST /api/x/auth/test
 * 用于测试和诊断OAuth流程的各个步骤
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { test_type, user_id, state, code } = body;

    console.log('OAuth test request:', { test_type, user_id, has_state: !!state, has_code: !!code });

    switch (test_type) {
      case 'generate_state':
        return await testGenerateState(user_id);
      
      case 'validate_state':
        return await testValidateState(state);
      
      case 'token_exchange':
        return await testTokenExchange(code, state);
      
      case 'cleanup':
        return await testCleanup();
      
      case 'full_flow':
        return await testFullFlow(user_id);
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid test_type',
            available_tests: ['generate_state', 'validate_state', 'token_exchange', 'cleanup', 'full_flow']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('OAuth test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function testGenerateState(userId?: string) {
  console.log('Testing state generation for user:', userId);
  
  const oauthManager = createXOAuthFlowManager();
  const startTime = Date.now();
  
  try {
    const { url, state } = await oauthManager.generateAuthUrl(userId);
    const duration = Date.now() - startTime;
    
    // 验证state是否正确保存
    const stats = getOAuthStateStats();
    const stateExists = stats.states.some(s => s.state === state.substring(0, 8) + '...');
    
    return NextResponse.json({
      success: true,
      test: 'generate_state',
      result: {
        state_generated: true,
        state_length: state.length,
        state_prefix: state.substring(0, 8) + '...',
        url_length: url.length,
        duration_ms: duration,
        state_saved: stateExists,
        total_states_after: stats.total
      },
      user_id: userId
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'generate_state',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
  }
}

async function testValidateState(state?: string) {
  if (!state) {
    return NextResponse.json({
      success: false,
      test: 'validate_state',
      error: 'State parameter is required'
    });
  }

  console.log('Testing state validation:', state.substring(0, 8) + '...');
  
  const startTime = Date.now();
  const statsBefore = getOAuthStateStats();
  
  try {
    // 这里我们只能测试状态检索，不执行实际的token交换
    const stateData = getOAuthState(state);
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      test: 'validate_state',
      result: {
        state_found: !!stateData,
        state_age: stateData ? Math.round((Date.now() - stateData.timestamp) / 1000) : null,
        state_valid: stateData ? (Date.now() - stateData.timestamp < 15 * 60 * 1000) : false,
        has_code_verifier: stateData?.codeVerifier ? true : false,
        has_code_challenge: stateData?.codeChallenge ? true : false,
        duration_ms: duration,
        total_states_before: statsBefore.total,
        total_states_after: getOAuthStateStats().total
      },
      state_prefix: state.substring(0, 8) + '...'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'validate_state',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
  }
}

async function testTokenExchange(code?: string, state?: string) {
  if (!code || !state) {
    return NextResponse.json({
      success: false,
      test: 'token_exchange',
      error: 'Both code and state parameters are required'
    });
  }

  console.log('Testing token exchange:', state.substring(0, 8) + '...');
  
  const oauthManager = createXOAuthFlowManager();
  const startTime = Date.now();
  
  try {
    // 实际执行token交换
    const tokens = await oauthManager.handleCallback(code, state);
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      test: 'token_exchange',
      result: {
        tokens_received: true,
        access_token_length: tokens.accessToken.length,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn,
        has_refresh_token: !!tokens.refreshToken,
        duration_ms: duration,
        states_after: getOAuthStateStats().total
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'token_exchange',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
      states_after: getOAuthStateStats().total
    });
  }
}

async function testCleanup() {
  console.log('Testing cleanup...');
  
  const startTime = Date.now();
  const statsBefore = getDetailedOAuthStateStats();
  
  try {
    // 强制清理过期状态
    forceCleanupOAuthStates();
    
    const statsAfter = getDetailedOAuthStateStats();
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      test: 'cleanup',
      result: {
        states_before: statsBefore.total,
        states_after: statsAfter.total,
        states_cleaned: statsBefore.total - statsAfter.total,
        duration_ms: duration
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'cleanup',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
  }
}

async function testFullFlow(userId?: string) {
  console.log('Testing full OAuth flow for user:', userId);
  
  const oauthManager = createXOAuthFlowManager();
  const startTime = Date.now();
  
  try {
    // 1. 生成授权URL
    const { url, state } = await oauthManager.generateAuthUrl(userId);
    
    // 2. 验证状态保存
    const stateData = getOAuthState(state);
    if (!stateData) {
      throw new Error('State not found after generation');
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      test: 'full_flow',
      result: {
        step1_generation: {
          state_generated: true,
          state_prefix: state.substring(0, 8) + '...',
          url_generated: !!url,
          url_length: url.length
        },
        step2_validation: {
          state_found: !!stateData,
          state_age: Math.round((Date.now() - stateData.timestamp) / 1000),
          has_code_verifier: !!stateData.codeVerifier,
          has_code_challenge: !!stateData.codeChallenge
        },
        note: 'Full flow test successful. For token exchange, you need a real authorization code from X.',
        duration_ms: duration
      },
      user_id: userId
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'full_flow',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
  }
}

export async function GET(request: NextRequest) {
  // GET请求返回当前状态信息
  const stats = getOAuthStateStats();
  const detailedStats = getDetailedOAuthStateStats();
  
  return NextResponse.json({
    success: true,
    endpoint: '/api/x/auth/test',
    available_tests: ['generate_state', 'validate_state', 'token_exchange', 'cleanup', 'full_flow'],
    current_state: {
      basic_stats: stats,
      detailed_stats: detailedStats
    },
    usage: {
      POST: {
        generate_state: 'Generate a new OAuth state (optional: user_id)',
        validate_state: 'Validate an existing state (required: state)',
        token_exchange: 'Test token exchange (required: code, state)',
        cleanup: 'Force cleanup expired states',
        full_flow: 'Test complete OAuth flow (optional: user_id)'
      }
    }
  });
}