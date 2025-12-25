import { NextRequest, NextResponse } from 'next/server';

// FansGurus 实际服务价格数据
const fansGurusServicePrices = {
  followers: {
    standard: { rate: 0.002, min: 100, max: 50000, time: '1-3 days', quality: 'Standard' },
    premium: { rate: 0.005, min: 100, max: 100000, time: '1-3 days', quality: 'HQ/REAL' },
    targeted: { rate: 0.008, min: 100, max: 50000, time: '1-3 days', quality: 'Targeted' },
    instant: { rate: 0.0024, min: 100, max: 10000, time: '5-15 minutes', quality: 'Instant' },
    longterm: { rate: 0.0022, min: 1000, max: 100000, time: '30-365 days', quality: 'Long-term' }
  },
  likes: {
    standard: { rate: 0.0008, min: 50, max: 50000, time: '1-2 hours', quality: 'Standard' },
    premium: { rate: 0.0012, min: 50, max: 100000, time: '1-2 hours', quality: 'HQ/REAL' },
    instant: { rate: 0.001, min: 50, max: 20000, time: '30 minutes', quality: 'Instant' }
  },
  views: {
    standard: { rate: 0.00008, min: 1000, max: 1000000, time: '30 minutes', quality: 'Standard' },
    premium: { rate: 0.00012, min: 1000, max: 2000000, time: '30 minutes', quality: 'HQ/REAL' }
  },
  comments: {
    standard: { rate: 0.008, min: 10, max: 10000, time: '1-2 hours', quality: 'Standard' },
    premium: { rate: 0.012, min: 10, max: 20000, time: '1-2 hours', quality: 'HQ/REAL' }
  },
  shares: {
    standard: { rate: 0.006, min: 50, max: 50000, time: '2-4 hours', quality: 'Standard' },
    premium: { rate: 0.01, min: 50, max: 100000, time: '2-4 hours', quality: 'HQ/REAL' }
  }
};

// 计算目标完成预算
function calculateTargetBudget(
  serviceType: keyof typeof fansGurusServicePrices,
  currentQuantity: number,
  targetQuantity: number,
  quality: 'standard' | 'premium' | 'targeted' | 'instant' | 'longterm' = 'standard'
) {
  const difference = Math.max(0, targetQuantity - currentQuantity);
  const priceCategory = fansGurusServicePrices[serviceType]?.[quality as keyof typeof fansGurusServicePrices[typeof serviceType]];
  
  if (!priceCategory || difference <= 0) {
    return {
      required: 0,
      quantity: 0,
      unitPrice: 0,
      estimatedTime: 'N/A',
      canAfford: true
    };
  }

  // 增加10%缓冲以应对自然流失
  const bufferQuantity = Math.ceil(difference * 1.1);
  const finalQuantity = Math.min(bufferQuantity, priceCategory.max);
  
  // 检查是否达到最小订单量
  if (finalQuantity < priceCategory.min) {
    return {
      required: priceCategory.min * priceCategory.rate,
      quantity: priceCategory.min,
      unitPrice: priceCategory.rate,
      estimatedTime: priceCategory.time,
      canAfford: false,
      message: `最小订单量为 ${priceCategory.min} 个`
    };
  }

  return {
    required: finalQuantity * priceCategory.rate,
    quantity: finalQuantity,
    unitPrice: priceCategory.rate,
    estimatedTime: priceCategory.time,
    quality: priceCategory.quality
  };
}

// 获取预算分析
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      targets = [], 
      currentBalance = 100, // 默认余额，实际应从钱包API获取
      preferredQuality = 'standard' 
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    const budgetAnalysis = {
      targets: [] as Array<{
        targetId: string;
        serviceType: string;
        currentQuantity: number;
        targetQuantity: number;
        gap: number;
        budget: any;
        canAfford: boolean;
        urgency: string;
      }>,
      summary: {
        totalTargets: targets.length,
        totalRequired: 0,
        totalAffordable: 0,
        remainingBalance: currentBalance,
        budgetGap: 0,
        affordableTargets: 0,
        recommendations: [] as string[]
      }
    };

    // 分析每个目标的预算需求
    for (const target of targets) {
      const { serviceType, currentQuantity, targetQuantity, quality = preferredQuality } = target;
      
      const analysis = calculateTargetBudget(
        serviceType,
        currentQuantity,
        targetQuantity,
        quality
      );

      const canAfford = analysis.required <= currentBalance;
      
      budgetAnalysis.targets.push({
        targetId: target.id || Math.random().toString(36),
        serviceType,
        currentQuantity,
        targetQuantity,
        gap: Math.max(0, targetQuantity - currentQuantity),
        budget: analysis,
        canAfford,
        urgency: calculateUrgency(targetQuantity - currentQuantity, targetQuantity)
      });

      budgetAnalysis.summary.totalRequired += analysis.required;
      if (canAfford) {
        budgetAnalysis.summary.totalAffordable += analysis.required;
        budgetAnalysis.summary.affordableTargets++;
      }
    }

    budgetAnalysis.summary.budgetGap = Math.max(0, budgetAnalysis.summary.totalRequired - currentBalance);
    budgetAnalysis.summary.remainingBalance = currentBalance - budgetAnalysis.summary.totalAffordable;

    // 生成推荐建议
    budgetAnalysis.summary.recommendations = generateRecommendations(
      budgetAnalysis,
      currentBalance
    );

    return NextResponse.json({
      ok: true,
      budgetAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Budget calculation error:', error);
    return NextResponse.json(
      { error: '预算计算失败' },
      { status: 500 }
    );
  }
}

// 计算紧急程度
function calculateUrgency(gap: number, target: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const percentage = target > 0 ? (gap / target) * 100 : 0;
  
  if (percentage > 80) return 'CRITICAL';
  if (percentage > 50) return 'HIGH';
  if (percentage > 20) return 'MEDIUM';
  return 'LOW';
}

// 生成推荐建议
function generateRecommendations(analysis: any, currentBalance: number): string[] {
  const recommendations = [];
  const { summary } = analysis;

  if (summary.budgetGap > 0) {
    recommendations.push(`建议充值 ${summary.budgetGap.toFixed(2)} USDT 以完成所有目标`);
  }

  if (summary.affordableTargets < summary.totalTargets) {
    recommendations.push(`优先完成 ${summary.affordableTargets} 个可负担的目标`);
  }

  // 找出性价比最高的目标
  const costEffectiveTargets = analysis.targets
    .filter((t: any) => t.canAfford)
    .sort((a: any, b: any) => a.budget.required - b.budget.required)
    .slice(0, 2);

  costEffectiveTargets.forEach((target: any) => {
    recommendations.push(
      `推荐优先处理 ${target.serviceType} 目标，仅需 ${target.budget.required.toFixed(2)} USDT`
    );
  });

  if (summary.remainingBalance > 10) {
    recommendations.push(`建议保留 ${summary.remainingBalance.toFixed(2)} USDT 作为应急资金`);
  }

  return recommendations;
}

// 获取服务价格列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('type') as keyof typeof fansGurusServicePrices;

    if (serviceType && fansGurusServicePrices[serviceType]) {
      return NextResponse.json({
        serviceType,
        prices: fansGurusServicePrices[serviceType],
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      allServices: fansGurusServicePrices,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Price list error:', error);
    return NextResponse.json(
      { error: '获取价格列表失败' },
      { status: 500 }
    );
  }
}