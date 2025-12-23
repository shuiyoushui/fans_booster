import { NextRequest, NextResponse } from 'next/server';
import { XAPI, DataMonitor } from '@/lib/api';
import { MonitoringTarget, MonitoringResult } from '@/types';

// 模拟数据库存储
let monitoringTargets: MonitoringTarget[] = [];
let monitoringResults: MonitoringResult[] = [];

export async function GET() {
  return NextResponse.json({ 
    targets: monitoringTargets,
    results: monitoringResults
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newTarget: MonitoringTarget = {
      id: Date.now().toString(),
      accountId: body.accountId,
      metric: body.metric,
      targetValue: body.targetValue,
      currentValue: body.currentValue || 0,
      tolerancePercentage: body.tolerancePercentage || 10,
      autoOrderEnabled: body.autoOrderEnabled || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    monitoringTargets.push(newTarget);
    return NextResponse.json({ target: newTarget }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create monitoring target' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const targetIndex = monitoringTargets.findIndex(target => target.id === id);
    if (targetIndex === -1) {
      return NextResponse.json(
        { error: 'Monitoring target not found' },
        { status: 404 }
      );
    }

    monitoringTargets[targetIndex] = {
      ...monitoringTargets[targetIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return NextResponse.json({ target: monitoringTargets[targetIndex] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update monitoring target' },
      { status: 500 }
    );
  }
}

// 监控数据同步端点
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, accessToken } = body;

    // 这里应该获取账号信息并更新监控数据
    // 模拟数据更新
    const updatedResults: MonitoringResult[] = [];

    for (const target of monitoringTargets) {
      if (target.accountId === accountId) {
        // 模拟获取当前数据
        const currentData = await XAPI.getProfileData('mock_username', accessToken);
        const currentValue = currentData.followers_count; // 根据metric类型获取对应数据

        const gapAnalysis = await DataMonitor.analyzeGap(
          currentValue,
          target.targetValue,
          target.tolerancePercentage
        );

        const result: MonitoringResult = {
          id: Date.now().toString() + '_' + target.id,
          accountId: target.accountId,
          metric: target.metric,
          value: currentValue,
          recordedAt: new Date(),
          gapAnalysis,
        };

        updatedResults.push(result);

        // 更新目标的当前值
        target.currentValue = currentValue;
        target.updatedAt = new Date();
      }
    }

    monitoringResults.push(...updatedResults);
    
    return NextResponse.json({ 
      message: 'Monitoring data updated successfully',
      results: updatedResults
    });
  } catch (error) {
    console.error('Monitoring sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync monitoring data' },
      { status: 500 }
    );
  }
}