import { NextRequest, NextResponse } from 'next/server';
import { SocialAccount } from '@/types';

// 模拟数据库存储 - 按用户分组
let userAccounts: { [userId: string]: SocialAccount[] } = {};

// 获取用户的社交账号列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    const accounts = userAccounts[userId] || [];

    return NextResponse.json({ accounts });

  } catch (error) {
    console.error('Get social accounts error:', error);
    return NextResponse.json(
      { error: '获取社交账号失败' },
      { status: 500 }
    );
  }
}

// 绑定新的社交账号
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      platform, 
      username, 
      accessToken, 
      refreshToken 
    } = body;

    // 验证必填字段
    if (!userId || !platform || !username) {
      return NextResponse.json(
        { error: '用户ID、平台和用户名都是必需的' },
        { status: 400 }
      );
    }

    // 验证平台
    const validPlatforms = ['x', 'instagram', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: '不支持的平台' },
        { status: 400 }
      );
    }

    // 初始化用户账号数组（如果不存在）
    if (!userAccounts[userId]) {
      userAccounts[userId] = [];
    }

    // 检查是否已经绑定了相同的账号
    const existingAccount = userAccounts[userId].find(
      acc => acc.platform === platform && acc.username === username
    );
    if (existingAccount) {
      return NextResponse.json(
        { error: '该账号已经绑定过了' },
        { status: 409 }
      );
    }

    // 验证账号（这里简化处理，实际应该调用平台API验证）
    const isValidAccount = await verifySocialAccount(platform, username, accessToken);
    if (!isValidAccount) {
      return NextResponse.json(
        { error: '账号验证失败，请检查用户名和访问令牌' },
        { status: 400 }
      );
    }

    // 创建新的社交账号记录
    const newAccount: SocialAccount = {
      id: Date.now().toString(),
      platform: platform as SocialAccount['platform'],
      username,
      accessToken,
      refreshToken,
      isActive: true,
      lastSync: new Date(),
      currentMetrics: {
        followers: 0,
        likes: 0,
        views: 0,
        comments: 0,
        shares: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    userAccounts[userId].push(newAccount);

    return NextResponse.json({ 
      account: newAccount,
      message: '账号绑定成功'
    }, { status: 201 });

  } catch (error) {
    console.error('Bind social account error:', error);
    return NextResponse.json(
      { error: '绑定社交账号失败' },
      { status: 500 }
    );
  }
}

// 更新社交账号信息
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, ...updates } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: '账号ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const accounts = userAccounts[userId] || [];
    const accountIndex = accounts.findIndex(acc => acc.id === id);
    
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: '未找到社交账号' },
        { status: 404 }
      );
    }

    // 如果更新了访问令牌，需要验证
    if (updates.accessToken) {
      const isValidAccount = await verifySocialAccount(
        accounts[accountIndex].platform,
        accounts[accountIndex].username,
        updates.accessToken
      );
      if (!isValidAccount) {
        return NextResponse.json(
          { error: '新的访问令牌验证失败' },
          { status: 400 }
        );
      }
    }

    // 更新账号信息
    userAccounts[userId][accountIndex] = {
      ...accounts[accountIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return NextResponse.json({ 
      account: userAccounts[userId][accountIndex],
      message: '账号信息更新成功'
    });

  } catch (error) {
    console.error('Update social account error:', error);
    return NextResponse.json(
      { error: '更新社交账号失败' },
      { status: 500 }
    );
  }
}

// 解绑社交账号
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: '账号ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const accounts = userAccounts[userId] || [];
    const accountIndex = accounts.findIndex(acc => acc.id === id);
    
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: '未找到社交账号' },
        { status: 404 }
      );
    }

    // 删除账号
    accounts.splice(accountIndex, 1);
    userAccounts[userId] = accounts;

    return NextResponse.json({ 
      message: '账号解绑成功'
    });

  } catch (error) {
    console.error('Unbind social account error:', error);
    return NextResponse.json(
      { error: '解绑社交账号失败' },
      { status: 500 }
    );
  }
}

// 验证社交账号的函数（模拟）
async function verifySocialAccount(
  platform: string, 
  username: string, 
  accessToken?: string
): Promise<boolean> {
  try {
    // 这里应该调用真实的平台API来验证账号
    // 目前返回true作为示例
    console.log(`验证${platform}账号: ${username}`);
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('Social account verification error:', error);
    return false;
  }
}