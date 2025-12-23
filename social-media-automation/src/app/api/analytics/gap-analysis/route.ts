import { NextRequest, NextResponse } from 'next/server';
import { GrowthTarget, SocialAccount, MonitoringResult, OrderSuggestion } from '@/types';
import db from '@/lib/database';

// 模拟服务价格数据
const servicePrices = {
  followers: { rate: 0.05, min: 100, max: 100000, time: '1-3 days' },
  likes: { rate: 0.001, min: 50, max: 50000, time: '1-2 hours' },
  views: { rate: 0.0001, min: 1000, max: 1000000, time: '30 minutes' },
  comments: { rate: 0.01, min: 10, max: 10000, time: '1-2 hours' },
  shares: { rate: 0.008, min: 50, max: 50000, time: '2-4 hours' }
};

// 模拟数据库数据（实际应该从其他API获取）

// 获取账号当前数据
function getCurrentAccountData(accountId: string): any {
  const account = db.getSocialAccounts().find(acc => acc.id === accountId);
  if (!account) {
    // 模拟一些默认数据
    return {
      followers: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 50000),
      views: Math.floor(Math.random() * 200000),
      comments: Math.floor(Math.random() * 5000),
      shares: Math.floor(Math.random() * 2000)
    };
  }
  return account.currentMetrics;
}

// 计算差距和订单建议
function calculateGapAndSuggestions(
  target: GrowthTarget,
  currentData: any
): {
  difference: number;
  percentageGap: number;
  needsAction: boolean;
  suggestedOrders: OrderSuggestion[];
} {
  const currentValue = currentData[target.targetMetric] || target.currentValue;
  const difference = Math.max(0, target.targetValue - currentValue);
  const percentageGap = target.targetValue > 0 ? (difference / target.targetValue) * 100 : 0;
  const needsAction = difference > 0;

  // 生成订单建议
  const suggestedOrders: OrderSuggestion[] = [];
  if (needsAction && target.autoOrderEnabled) {
    const serviceType = target.targetMetric as keyof typeof servicePrices;
    const priceInfo = servicePrices[serviceType];
    
    if (priceInfo) {
      // 计算最优套餐组合
      const packages = [];
      let remainingQuantity = difference;

      // 生成多个套餐选项
      const multipliers = [0.5, 1, 2, 3]; // 不同倍数的套餐
      for (const multiplier of multipliers) {
        const packageQuantity = Math.min(
          Math.ceil(difference * multiplier),
          priceInfo.max
        );
        
        if (packageQuantity >= priceInfo.min) {
          packages.push({
            id: `${serviceType}_${packageQuantity}`,
            name: `${packageQuantity} ${serviceType} package`,
            quantity: packageQuantity,
            price: packageQuantity * priceInfo.rate,
            estimatedTime: priceInfo.time
          });
        }
      }

      suggestedOrders.push({
        serviceType,
        requiredQuantity: difference,
        estimatedCost: difference * priceInfo.rate,
        recommendedPackages: packages
      });
    }
  }

  return {
    difference,
    percentageGap,
    needsAction,
    suggestedOrders
  };
}

// 分析单个目标的差距
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, targetId } = body;

    if (!userId || !targetId) {
      return NextResponse.json(
        { error: '用户ID和目标ID是必需的' },
        { status: 400 }
      );
    }

    // 查找目标
    const target = db.getGrowthTargets().find(t => t.id === targetId && t.userId === userId);
    if (!target) {
      return NextResponse.json(
        { error: '未找到指定的增长目标' },
        { status: 404 }
      );
    }

    // 获取当前数据
    let currentData: any;
    if (target.accountId) {
      currentData = getCurrentAccountData(target.accountId);
    } else {
      // 无账号目标的模拟数据
      currentData = {
        followers: target.targetValue * 0.3,
        likes: target.targetValue * 0.4,
        views: target.targetValue * 0.5,
        comments: target.targetValue * 0.2,
        shares: target.targetValue * 0.25
      };
    }

    // 计算差距
    const analysis = calculateGapAndSuggestions(target, currentData);

    // 创建监控结果记录
    const monitoringResult: MonitoringResult = {
      id: Date.now().toString(),
      accountId: target.accountId,
      targetId: target.id,
      metric: target.targetMetric,
      value: currentData[target.targetMetric] || target.currentValue,
      recordedAt: new Date(),
      gapAnalysis: {
        difference: analysis.difference,
        percentageGap: analysis.percentageGap,
        needsAction: analysis.needsAction,
        suggestedOrders: analysis.suggestedOrders
      }
    };

    return NextResponse.json({
      targetId: target.id,
      currentMetrics: currentData,
      gapAnalysis: analysis,
      monitoringResult,
      recommendation: analysis.needsAction ? {
        action: 'PLACE_ORDER',
        urgency: analysis.percentageGap > 50 ? 'HIGH' : analysis.percentageGap > 20 ? 'MEDIUM' : 'LOW',
        estimatedCost: analysis.suggestedOrders[0]?.estimatedCost || 0,
        suggestedPackage: analysis.suggestedOrders[0]?.recommendedPackages[0] || null
      } : {
        action: 'MONITOR',
        message: '当前进展良好，继续监控'
      }
    });

  } catch (error) {
    console.error('Gap analysis error:', error);
    return NextResponse.json(
      { error: '差距分析失败' },
      { status: 500 }
    );
  }
}

// 批量分析用户的所有目标
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

    // 获取用户的所有目标
    const userTargets = db.getGrowthTargets().filter(target => target.userId === userId);

    if (userTargets.length === 0) {
      return NextResponse.json({
        targets: [],
        summary: {
          totalTargets: 0,
          activeTargets: 0,
          needsAction: 0,
          totalEstimatedCost: 0
        }
      });
    }

    const analyses = [];
    let needsActionCount = 0;
    let totalEstimatedCost = 0;

    for (const target of userTargets) {
      // 获取当前数据
      let currentData: any;
      if (target.accountId) {
        currentData = getCurrentAccountData(target.accountId);
      } else {
        currentData = {
          followers: target.targetValue * 0.3,
          likes: target.targetValue * 0.4,
          views: target.targetValue * 0.5,
          comments: target.targetValue * 0.2,
          shares: target.targetValue * 0.25
        };
      }

      const analysis = calculateGapAndSuggestions(target, currentData);
      
      if (analysis.needsAction) {
        needsActionCount++;
        totalEstimatedCost += analysis.suggestedOrders[0]?.estimatedCost || 0;
      }

      analyses.push({
        targetId: target.id,
        targetMetric: target.targetMetric,
        targetValue: target.targetValue,
        currentValue: currentData[target.targetMetric] || target.currentValue,
        gapAnalysis: analysis,
        deadline: target.deadline,
        status: target.status
      });
    }

    return NextResponse.json({
      targets: analyses,
      summary: {
        totalTargets: userTargets.length,
        activeTargets: userTargets.filter(t => t.status === 'active').length,
        needsAction: needsActionCount,
        totalEstimatedCost,
        lastAnalyzed: new Date()
      }
    });

  } catch (error) {
    console.error('Batch gap analysis error:', error);
    return NextResponse.json(
      { error: '批量差距分析失败' },
      { status: 500 }
    );
  }
}