import { NextRequest, NextResponse } from 'next/server';
import { GrowthTarget, SocialAccount, MonitoringResult, OrderSuggestion } from '@/types';
import db from '@/lib/database';

// FansGurus 实际服务价格数据（基于官网价格更新）
const fansGurusServicePrices = {
  followers: {
    standard: { rate: 0.002, min: 100, max: 50000, time: '1-3 days', quality: 'standard' },
    premium: { rate: 0.005, min: 100, max: 100000, time: '1-3 days', quality: 'HQ/REAL' },
    targeted: { rate: 0.008, min: 100, max: 50000, time: '1-3 days', quality: '地区定向' },
    instant: { rate: 0.0024, min: 100, max: 10000, time: '5-15 minutes', quality: '即时启动' },
    longterm: { rate: 0.0022, min: 1000, max: 100000, time: '30-365 days', quality: 'R30-R365补量' }
  },
  likes: {
    standard: { rate: 0.0008, min: 50, max: 50000, time: '1-2 hours', quality: 'standard' },
    premium: { rate: 0.0012, min: 50, max: 100000, time: '1-2 hours', quality: 'HQ/REAL' },
    instant: { rate: 0.001, min: 50, max: 20000, time: '30 minutes', quality: '即时启动' }
  },
  views: {
    standard: { rate: 0.00008, min: 1000, max: 1000000, time: '30 minutes', quality: 'standard' },
    premium: { rate: 0.00012, min: 1000, max: 2000000, time: '30 minutes', quality: 'HQ/REAL' }
  },
  comments: {
    standard: { rate: 0.008, min: 10, max: 10000, time: '1-2 hours', quality: 'standard' },
    premium: { rate: 0.012, min: 10, max: 20000, time: '1-2 hours', quality: 'HQ/REAL' }
  },
  shares: {
    standard: { rate: 0.006, min: 50, max: 50000, time: '2-4 hours', quality: 'standard' },
    premium: { rate: 0.01, min: 50, max: 100000, time: '2-4 hours', quality: 'HQ/REAL' }
  }
};

// 默认价格数据（向后兼容）
const servicePrices = {
  followers: fansGurusServicePrices.followers.standard,
  likes: fansGurusServicePrices.likes.standard,
  views: fansGurusServicePrices.views.standard,
  comments: fansGurusServicePrices.comments.standard,
  shares: fansGurusServicePrices.shares.standard
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
  budgetAnalysis: {
    totalRequired: number;
    remainingBalance: number;
    affordablePackages: any[];
    budgetGap: number;
  };
} {
  const currentValue = currentData[target.targetMetric] || target.currentValue;
  const difference = Math.max(0, target.targetValue - currentValue);
  const percentageGap = target.targetValue > 0 ? (difference / target.targetValue) * 100 : 0;
  const needsAction = difference > 0;

  // 生成订单建议
  const suggestedOrders: OrderSuggestion[] = [];
  let totalRequiredBudget = 0;
  
  if (needsAction && target.autoOrderEnabled) {
    const serviceType = target.targetMetric as keyof typeof fansGurusServicePrices;
    const priceCategories = fansGurusServicePrices[serviceType];
    
    if (priceCategories) {
      // 生成不同质量等级的套餐选项
      const packages = [];
      
      Object.entries(priceCategories).forEach(([quality, priceInfo]) => {
        const packageQuantity = Math.min(
          Math.ceil(difference * 1.1), // 多10%以应对自然流失
          priceInfo.max
        );
        
        if (packageQuantity >= priceInfo.min) {
          const packageCost = packageQuantity * priceInfo.rate;
          packages.push({
            id: `${serviceType}_${quality}_${packageQuantity}`,
            name: `${packageQuantity} ${serviceType} (${quality})`,
            quantity: packageQuantity,
            price: packageCost,
            estimatedTime: priceInfo.time,
            quality: quality,
            rate: priceInfo.rate
          });
        }
      });

      // 按价格排序，优先推荐性价比高的套餐
      packages.sort((a, b) => a.price - b.price);
      
      // 计算完成目标所需总预算（使用最经济方案）
      totalRequiredBudget = packages[0]?.price || 0;

      suggestedOrders.push({
        serviceType,
        requiredQuantity: difference,
        estimatedCost: totalRequiredBudget,
        recommendedPackages: packages
      });
    }
  }

  // 预算分析（模拟用户余额，实际应从钱包API获取）
  const mockUserBalance = 100; // 假设用户有100 USDT
  const remainingBalance = mockUserBalance - totalRequiredBudget;
  const affordablePackages = suggestedOrders[0]?.recommendedPackages.filter(pkg => pkg.price <= mockUserBalance) || [];
  const budgetGap = Math.max(0, totalRequiredBudget - mockUserBalance);

  return {
    difference,
    percentageGap,
    needsAction,
    suggestedOrders,
    budgetAnalysis: {
      totalRequired: totalRequiredBudget,
      remainingBalance,
      affordablePackages,
      budgetGap
    }
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
      gapAnalysis: {
        difference: analysis.difference,
        percentageGap: analysis.percentageGap,
        needsAction: analysis.needsAction,
        suggestedOrders: analysis.suggestedOrders
      },
      monitoringResult,
      budgetAnalysis: analysis.budgetAnalysis,
      recommendation: analysis.needsAction ? {
        action: 'PLACE_ORDER',
        urgency: analysis.percentageGap > 50 ? 'HIGH' : analysis.percentageGap > 20 ? 'MEDIUM' : 'LOW',
        estimatedCost: analysis.budgetAnalysis.totalRequired,
        suggestedPackage: analysis.suggestedOrders[0]?.recommendedPackages.find(pkg => pkg.quality === 'standard') || analysis.suggestedOrders[0]?.recommendedPackages[0],
        budgetGap: analysis.budgetAnalysis.budgetGap,
        canAfford: analysis.budgetAnalysis.budgetGap <= 0,
        affordablePackages: analysis.budgetAnalysis.affordablePackages
      } : {
        action: 'MONITOR',
        message: '当前进展良好，继续监控',
        completionRate: (100 - analysis.percentageGap).toFixed(1) + '%'
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