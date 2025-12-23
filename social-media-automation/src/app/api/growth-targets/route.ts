import { NextRequest, NextResponse } from 'next/server';
import { GrowthTarget } from '@/types';
import db from '@/lib/database';

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

    const userTargets = db.getGrowthTargets().filter(target => target.userId === userId);

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
      accountId, // 可选
      targetMetric, 
      targetValue, 
      deadline, 
      autoOrderEnabled = false,
      budgetLimit,
      commentTemplates = [] // 新增评论内容集
    } = body;

    // 验证必填字段
    if (!userId || !targetMetric || !targetValue || !deadline) {
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

    // 验证评论内容集（如果目标类型是评论）
    if (targetMetric === 'comments' && commentTemplates.length === 0) {
      return NextResponse.json(
        { error: '评论目标需要提供评论内容集' },
        { status: 400 }
      );
    }

    // 获取当前值（如果有绑定的账号）
    let currentValue = 0;
    if (accountId) {
      // 这里应该从账号数据中获取当前值
      // 暂时使用模拟数据
      currentValue = Math.floor(Math.random() * targetValue * 0.7);
    }

    // 创建新的增长目标
    const newTarget: GrowthTarget = {
      id: Date.now().toString(),
      userId,
      accountId: accountId || undefined, // 支持无账号目标
      targetMetric: targetMetric as any,
      targetValue,
      currentValue,
      deadline: deadlineDate,
      autoOrderEnabled,
      budgetLimit,
      commentTemplates,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.addGrowthTarget(newTarget);

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

    const target = db.getGrowthTargets().find(t => t.id === id);
    if (!target) {
      return NextResponse.json(
        { error: '未找到增长目标' },
        { status: 404 }
      );
    }

    // 验证权限
    if (userId && target.userId !== userId) {
      return NextResponse.json(
        { error: '没有权限修改此目标' },
        { status: 403 }
      );
    }

    // 更新目标
    const updated = db.updateGrowthTarget(id, { ...updates, updatedAt: new Date() });

    if (!updated) {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      );
    }

    const updatedTarget = db.getGrowthTargets().find(t => t.id === id);

    return NextResponse.json({ 
      target: updatedTarget,
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

    const target = db.getGrowthTargets().find(t => t.id === id && t.userId === userId);
    if (!target) {
      return NextResponse.json(
        { error: '未找到增长目标或没有权限删除' },
        { status: 404 }
      );
    }

    // 软删除：标记为已取消
    const updated = db.updateGrowthTarget(id, { status: 'cancelled', updatedAt: new Date() });

    if (!updated) {
      return NextResponse.json(
        { error: '删除失败' },
        { status: 500 }
      );
    }

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