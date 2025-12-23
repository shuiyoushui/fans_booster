import { NextRequest, NextResponse } from 'next/server';
import { GrowthTarget } from '@/types';

// 模拟数据库存储
let growthTargets: GrowthTarget[] = [];

// 获取用户的增长目标
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

    const userTargets = growthTargets.filter(target => target.userId === userId);

    return NextResponse.json({ 
      targets: userTargets.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });

  } catch (error) {
    console.error('Get growth targets error:', error);
    return NextResponse.json(
      { error: '获取增长目标失败' },
      { status: 500 }
    );
  }
}

// 创建新的增长目标
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      accountId, 
      targetMetric, 
      targetValue, 
      deadline, 
      autoOrderEnabled = false,
      budgetLimit 
    } = body;

    // 验证必填字段
    if (!userId || !accountId || !targetMetric || !targetValue || !deadline) {
      return NextResponse.json(
        { error: '所有必填字段都是必需的' },
        { status: 400 }
      );
    }

    // 验证目标值
    if (targetValue <= 0) {
      return NextResponse.json(
        { error: '目标值必须大于0' },
        { status: 400 }
      );
    }

    // 验证截止日期
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json(
        { error: '截止日期必须是未来时间' },
        { status: 400 }
      );
    }

    // 验证预算限制
    if (budgetLimit && budgetLimit <= 0) {
      return NextResponse.json(
        { error: '预算限制必须大于0' },
        { status: 400 }
      );
    }

    // 获取当前值（这里简化处理，实际应该从账号数据中获取）
    const currentValue = 0;

    // 创建新的增长目标
    const newTarget: GrowthTarget = {
      id: Date.now().toString(),
      userId,
      accountId,
      targetMetric,
      targetValue,
      currentValue,
      deadline: deadlineDate,
      autoOrderEnabled,
      budgetLimit,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    growthTargets.push(newTarget);

    return NextResponse.json({ 
      target: newTarget,
      message: '增长目标创建成功'
    }, { status: 201 });

  } catch (error) {
    console.error('Create growth target error:', error);
    return NextResponse.json(
      { error: '创建增长目标失败' },
      { status: 500 }
    );
  }
}

// 更新增长目标
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: '目标ID是必需的' },
        { status: 400 }
      );
    }

    const targetIndex = growthTargets.findIndex(t => t.id === id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { error: '未找到增长目标' },
        { status: 404 }
      );
    }

    // 验证权限
    if (userId && growthTargets[targetIndex].userId !== userId) {
      return NextResponse.json(
        { error: '没有权限修改此目标' },
        { status: 403 }
      );
    }

    // 更新目标
    growthTargets[targetIndex] = {
      ...growthTargets[targetIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return NextResponse.json({ 
      target: growthTargets[targetIndex],
      message: '增长目标更新成功'
    });

  } catch (error) {
    console.error('Update growth target error:', error);
    return NextResponse.json(
      { error: '更新增长目标失败' },
      { status: 500 }
    );
  }
}

// 删除增长目标
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: '目标ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const targetIndex = growthTargets.findIndex(t => t.id === id && t.userId === userId);
    if (targetIndex === -1) {
      return NextResponse.json(
        { error: '未找到增长目标或没有权限删除' },
        { status: 404 }
      );
    }

    // 软删除：标记为已取消
    growthTargets[targetIndex].status = 'cancelled';
    growthTargets[targetIndex].updatedAt = new Date();

    return NextResponse.json({ 
      message: '增长目标已取消'
    });

  } catch (error) {
    console.error('Delete growth target error:', error);
    return NextResponse.json(
      { error: '删除增长目标失败' },
      { status: 500 }
    );
  }
}