import { NextRequest, NextResponse } from 'next/server';

/**
 * X平台OAuth配置检查工具
 * GET /api/x/config/check
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Starting X OAuth configuration check...');
    
    // 环境变量检查
    const envChecks = {
      clientId: {
        name: 'X_CLIENT_ID',
        value: process.env.X_CLIENT_ID?.substring(0, 10) + '...' || 'missing',
        isValid: !!process.env.X_CLIENT_ID && process.env.X_CLIENT_ID.length > 0,
        format: process.env.X_CLIENT_ID?.match(/^[A-Za-z0-9_-]+$/) ? 'valid' : 'invalid'
      },
      clientSecret: {
        name: 'X_CLIENT_SECRET',
        value: process.env.X_CLIENT_SECRET?.substring(0, 10) + '...' || 'missing',
        isValid: !!process.env.X_CLIENT_SECRET && process.env.X_CLIENT_SECRET.length > 0,
        format: process.env.X_CLIENT_SECRET?.match(/^[A-Za-z0-9_-]+$/) ? 'valid' : 'invalid'
      },
      redirectUri: {
        name: 'X_REDIRECT_URI',
        value: process.env.X_REDIRECT_URI || 'missing',
        isValid: !!process.env.X_REDIRECT_URI && process.env.X_REDIRECT_URI.length > 0,
        isHttps: process.env.X_REDIRECT_URI?.startsWith('https://'),
        domain: process.env.X_REDIRECT_URI ? new URL(process.env.X_REDIRECT_URI).hostname : 'invalid'
      },
      appUrl: {
        name: 'NEXT_PUBLIC_APP_URL',
        value: process.env.NEXT_PUBLIC_APP_URL || 'missing',
        isValid: !!process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.length > 0,
        isHttps: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'),
        domain: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname : 'invalid'
      }
    };

    // X开发者门户配置要求检查
    const portalConfigChecks = {
      appType: {
        requirement: 'Web App, Automated App or Bot',
        description: 'OAuth 2.0流程必须选择正确的应用类型',
        recommendation: '在X开发者门户中确保应用类型设置为"Web App, Automated App or Bot"'
      },
      callbackUri: {
        requirement: '必须与X_REDIRECT_URI完全匹配',
        description: '回调URI必须精确匹配，包括协议、域名、路径',
        recommendation: `在X开发者门户中添加回调URI: ${process.env.X_REDIRECT_URI}`,
        commonMistakes: [
          '使用http://而非https://',
          '域名或路径不匹配',
          '包含或缺少尾部斜杠',
          '使用localhost而非生产域名'
        ]
      },
      permissions: {
        requirement: '必须包含所需权限',
        description: 'OAuth 2.0应用需要配置正确的权限范围',
        requiredScopes: [
          'users.read - 读取用户信息',
          'offline.access - 获取refresh token',
          'tweet.read - 读取推文',
          'follows.read - 读取关注关系'
        ],
        recommendation: '在X开发者门户的权限管理中添加这些权限范围'
      },
      appStatus: {
        requirement: '应用必须处于活跃状态',
        description: '应用需要通过审核并处于活跃状态才能正常使用',
        recommendation: '确保应用状态为"Active"而非"Suspended"或"Inactive"'
      }
    };

    // API连接测试
    let apiConnectionTest = {
      status: 'not_tested',
      details: null
    };

    try {
      if (envChecks.clientId.isValid && envChecks.clientSecret.isValid) {
        console.log('Testing X API connection...');
        
        // 测试基本连接 - 尝试获取用户信息（预期失败，但能验证API连接）
        const response = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${envChecks.clientId.value}`
          }
        });

        if (response.status === 401) {
          apiConnectionTest = {
            status: 'api_accessible',
            details: 'API端点可访问，但需要有效授权（401是预期状态）'
          } as any;
        } else if (response.status === 403) {
          apiConnectionTest = {
            status: 'app_restricted',
            details: '应用可能被限制或权限不足'
          } as any;
        } else {
          apiConnectionTest = {
            status: 'unexpected_response',
            details: `API返回意外状态码: ${response.status}`
          } as any;
        }
      }
    } catch (error) {
      apiConnectionTest = {
        status: 'connection_failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as any;
    }

    // 配置问题诊断
    const issues = [];
    const recommendations = [];

    // 检查环境变量
    Object.entries(envChecks).forEach(([key, check]) => {
      if (!check.isValid) {
        issues.push(`${check.name} is missing or empty`);
      }
      if (key === 'clientSecret' && 'format' in check && check.format === 'invalid') {
        issues.push(`${check.name} format appears invalid`);
      }
    });

    // 检查HTTPS
    if (!envChecks.redirectUri.isHttps) {
      issues.push('X_REDIRECT_URI must use HTTPS');
    }
    if (!envChecks.appUrl.isHttps) {
      issues.push('NEXT_PUBLIC_APP_URL must use HTTPS');
    }

    // 检查域名匹配
    if (envChecks.redirectUri.domain !== envChecks.appUrl.domain) {
      issues.push('Redirect URI domain must match app URL domain');
      recommendations.push('Ensure X_REDIRECT_URI uses the same domain as NEXT_PUBLIC_APP_URL');
    }

    // 检查API连接
    if (apiConnectionTest.status === 'app_restricted') {
      issues.push('X app may be suspended or have insufficient permissions');
      recommendations.push('Check X Developer Portal for app status and permissions');
    }

    // 生成完整配置指南
    const configGuide = {
      step1: {
        title: '1. 检查X开发者门户应用设置',
        actions: [
          '登录X开发者门户: https://developer.x.com/en/portal/dashboard',
          '选择你的应用',
          '确认应用类型为"Web App, Automated App or Bot"',
          '确认应用状态为"Active"'
        ]
      },
      step2: {
        title: '2. 配置OAuth 2.0回调URI',
        actions: [
          `添加精确的回调URI: ${process.env.X_REDIRECT_URI}`,
          '确保使用HTTPS协议',
          '不要包含查询参数或片段标识符',
          '本地开发可临时添加http://localhost:3000/auth/x/callback'
        ]
      },
      step3: {
        title: '3. 配置权限范围',
        actions: [
          '进入应用的权限管理页面',
          '添加并批准以下权限:',
          '  - users.read',
          '  - offline.access', 
          '  - tweet.read',
          '  - follows.read',
          '等待权限审批通过'
        ]
      },
      step4: {
        title: '4. 验证客户端凭证',
        actions: [
          '确认Client ID正确复制',
          '确认Client Secret正确复制（重新生成如果需要）',
          '确保没有额外的空格或换行符'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        issuesCount: issues.length,
        recommendationsCount: recommendations.length,
        overallStatus: issues.length === 0 ? 'configured' : 'needs_attention'
      },
      environment: envChecks,
      portalRequirements: portalConfigChecks,
      apiTest: apiConnectionTest,
      issues,
      recommendations,
      configGuide,
      troubleshooting: {
        commonProblems: [
          {
            problem: 'Invalid or expired state',
            cause: '回调URI不匹配或state过期',
            solution: '确保X开发者门户中的回调URI与X_REDIRECT_URI完全匹配'
          },
          {
            problem: '403 Forbidden',
            cause: '应用权限不足或被暂停',
            solution: '检查应用状态和权限配置'
          },
          {
            problem: 'Client authentication failed',
            cause: 'Client ID或Secret错误',
            solution: '重新生成并更新Client Secret'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Configuration check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 测试X API连接
 * POST /api/x/config/check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType } = body;

    console.log('Testing X API connection with type:', testType);

    switch (testType) {
      case 'oauth_url':
        // 测试OAuth授权URL生成
        const { X_CLIENT_ID, X_REDIRECT_URI } = process.env;
        
        if (!X_CLIENT_ID || !X_REDIRECT_URI) {
          throw new Error('Missing X_CLIENT_ID or X_REDIRECT_URI');
        }

        const testState = 'test_' + Date.now();
        const testCodeChallenge = 'test_challenge_' + Date.now();
        
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: X_CLIENT_ID,
          redirect_uri: X_REDIRECT_URI,
          scope: 'users.read offline.access',
          state: testState,
          code_challenge: testCodeChallenge,
          code_challenge_method: 'S256'
        });

        const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

        return NextResponse.json({
          success: true,
          testType: 'oauth_url',
          result: {
            authUrl,
            parameters: {
              clientId: X_CLIENT_ID.substring(0, 10) + '...',
              redirectUri: X_REDIRECT_URI,
              state: testState,
              scopes: ['users.read', 'offline.access']
            },
            note: 'This URL can be used to test the OAuth flow manually'
          }
        });

      case 'token_endpoint':
        // 测试token端点可达性
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.X_CLIENT_ID || '',
            client_secret: process.env.X_CLIENT_SECRET || ''
          }).toString()
        });

        return NextResponse.json({
          success: true,
          testType: 'token_endpoint',
          result: {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            accessible: tokenResponse.status !== 404 && tokenResponse.status !== 503,
            note: tokenResponse.status === 401 ? 'Token endpoint accessible (401 expected without auth)' : 'Endpoint status'
          }
        });

      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

  } catch (error) {
    console.error('API test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}