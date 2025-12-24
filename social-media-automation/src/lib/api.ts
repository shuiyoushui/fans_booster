import { SocialAccount, MonitoringTarget, ServicePackage, AutoOrder, MonitoringResult } from '@/types';

// FansGurus API 配置
const FANSGURUS_API_BASE = 'https://fansgurus.com/api';
const FANSGURUS_API_KEY = process.env.FANSGURUS_API_KEY || '';

export class FansGurusAPI {
  // 获取服务列表和价格
  static async getServices() {
    try {
      const response = await fetch(`${FANSGURUS_API_BASE}/services`, {
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch services:', error);
      // 如果API调用失败，返回模拟数据作为fallback
      return this.getMockServices();
    }
  }

  // 获取价格列表（专门用于预算计算）
  static async getPrices(serviceType?: string) {
    try {
      const url = serviceType 
        ? `${FANSGURUS_API_BASE}/prices/${serviceType}`
        : `${FANSGURUS_API_BASE}/prices`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      return this.getMockPrices(serviceType);
    }
  }

  // 计算订单费用
  static async calculateOrderCost(serviceId: string, quantity: number) {
    try {
      const response = await fetch(`${FANSGURUS_API_BASE}/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: serviceId,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to calculate order cost:', error);
      // 返回模拟计算结果
      return this.getMockCalculate(serviceId, quantity);
    }
  }

  // 获取预算分析
  static async getBudgetAnalysis(targets: Array<any>, currentBalance: number) {
    try {
      const response = await fetch(`${FANSGURUS_API_BASE}/budget/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targets,
          currentBalance,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get budget analysis:', error);
      return this.getMockBudgetAnalysis(targets, currentBalance);
    }
  }

  static async createOrder(serviceId: string, quantity: number, link: string) {
    try {
      const response = await fetch(`${FANSGURUS_API_BASE}/order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: serviceId,
          quantity: quantity,
          link: link,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  static async checkOrderStatus(orderId: string) {
    try {
      const response = await fetch(`${FANSGURUS_API_BASE}/status/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${FANSGURUS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to check order status:', error);
      throw error;
    }
  }

  // Mock数据方法（作为API调用失败时的fallback）
  private static getMockServices() {
    return {
      followers: [
        { id: 'followers_standard_1000', name: '1000 Standard Followers', rate: 0.002, min: 100, max: 50000, quality: 'Standard' },
        { id: 'followers_premium_1000', name: '1000 Premium Followers', rate: 0.005, min: 100, max: 100000, quality: 'HQ/REAL' },
        { id: 'followers_targeted_1000', name: '1000 Targeted Followers', rate: 0.008, min: 100, max: 50000, quality: 'Targeted' }
      ],
      likes: [
        { id: 'likes_standard_500', name: '500 Standard Likes', rate: 0.0008, min: 50, max: 50000, quality: 'Standard' },
        { id: 'likes_premium_500', name: '500 Premium Likes', rate: 0.0012, min: 50, max: 100000, quality: 'HQ/REAL' }
      ],
      views: [
        { id: 'views_standard_10000', name: '10K Standard Views', rate: 0.00008, min: 1000, max: 1000000, quality: 'Standard' }
      ],
      comments: [
        { id: 'comments_standard_100', name: '100 Standard Comments', rate: 0.008, min: 10, max: 10000, quality: 'Standard' }
      ],
      shares: [
        { id: 'shares_standard_500', name: '500 Standard Shares', rate: 0.006, min: 50, max: 50000, quality: 'Standard' }
      ]
    };
  }

  private static getMockPrices(serviceType?: string) {
    const prices = {
      followers: {
        standard: { rate: 0.002, min: 100, max: 50000, time: '1-3 days', quality: 'Standard' },
        premium: { rate: 0.005, min: 100, max: 100000, time: '1-3 days', quality: 'HQ/REAL' },
        targeted: { rate: 0.008, min: 100, max: 50000, time: '1-3 days', quality: 'Targeted' }
      },
      likes: {
        standard: { rate: 0.0008, min: 50, max: 50000, time: '1-2 hours', quality: 'Standard' },
        premium: { rate: 0.0012, min: 50, max: 100000, time: '1-2 hours', quality: 'HQ/REAL' }
      },
      views: {
        standard: { rate: 0.00008, min: 1000, max: 1000000, time: '30 minutes', quality: 'Standard' }
      },
      comments: {
        standard: { rate: 0.008, min: 10, max: 10000, time: '1-2 hours', quality: 'Standard' }
      },
      shares: {
        standard: { rate: 0.006, min: 50, max: 50000, time: '2-4 hours', quality: 'Standard' }
      }
    };

    return serviceType ? { [serviceType]: prices[serviceType as keyof typeof prices] } : prices;
  }

  private static getMockCalculate(serviceId: string, quantity: number) {
    const serviceRates: { [key: string]: number } = {
      'followers_standard': 0.002,
      'followers_premium': 0.005,
      'followers_targeted': 0.008,
      'likes_standard': 0.0008,
      'likes_premium': 0.0012,
      'views_standard': 0.00008,
      'comments_standard': 0.008,
      'shares_standard': 0.006
    };

    let rate = 0.001; // 默认费率
    for (const [key, value] of Object.entries(serviceRates)) {
      if (serviceId.includes(key)) {
        rate = value;
        break;
      }
    }

    return {
      serviceId,
      quantity,
      unitPrice: rate,
      totalPrice: quantity * rate,
      currency: 'USDT',
      estimatedTime: '1-3 days'
    };
  }

  private static getMockBudgetAnalysis(targets: Array<any>, currentBalance: number) {
    let totalRequired = 0;
    const analysis = targets.map(target => {
      const gap = Math.max(0, target.targetQuantity - target.currentQuantity);
      const mockRate = 0.005; // 模拟统一费率
      const required = gap * mockRate;
      totalRequired += required;
      
      return {
        ...target,
        gap,
        required,
        canAfford: required <= currentBalance,
        unitPrice: mockRate
      };
    });

    return {
      targets: analysis,
      summary: {
        totalTargets: targets.length,
        totalRequired,
        remainingBalance: currentBalance - totalRequired,
        budgetGap: Math.max(0, totalRequired - currentBalance),
        affordableTargets: analysis.filter(t => t.canAfford).length
      }
    };
  }
}

// X (Twitter) API 模拟
export class XAPI {
  static async getProfileData(username: string, accessToken: string) {
    try {
      // 模拟获取X账号数据
      // 实际实现需要使用 X API v2
      const mockData = {
        followers_count: Math.floor(Math.random() * 10000) + 1000,
        following_count: Math.floor(Math.random() * 1000) + 100,
        tweet_count: Math.floor(Math.random() * 5000) + 500,
        likes_count: Math.floor(Math.random() * 20000) + 2000,
      };

      return mockData;
    } catch (error) {
      console.error('Failed to fetch X profile data:', error);
      throw error;
    }
  }

  static async getEngagementMetrics(username: string, accessToken: string) {
    try {
      // 模拟获取互动数据
      const mockMetrics = {
        average_likes: Math.floor(Math.random() * 1000) + 100,
        average_retweets: Math.floor(Math.random() * 500) + 50,
        average_comments: Math.floor(Math.random() * 200) + 20,
        engagement_rate: (Math.random() * 10 + 1).toFixed(2),
      };

      return mockMetrics;
    } catch (error) {
      console.error('Failed to fetch X engagement metrics:', error);
      throw error;
    }
  }
}

// 数据监控和分析
export class DataMonitor {
  static async analyzeGap(currentValue: number, targetValue: number, tolerancePercentage: number) {
    const difference = targetValue - currentValue;
    const percentageGap = (difference / targetValue) * 100;
    const needsAction = percentageGap > tolerancePercentage;

    return {
      difference,
      percentageGap,
      needsAction,
    };
  }

  static async recommendServicePackage(
    metric: string,
    gap: number,
    availablePackages: ServicePackage[]
  ): Promise<ServicePackage | null> {
    const suitablePackages = availablePackages.filter(
      pkg => pkg.type === metric && pkg.isActive && pkg.quantity >= gap
    );

    if (suitablePackages.length === 0) {
      return null;
    }

    // 选择最接近所需数量的套餐
    return suitablePackages.reduce((best, current) => {
      const bestDiff = Math.abs(best.quantity - gap);
      const currentDiff = Math.abs(current.quantity - gap);
      return currentDiff < bestDiff ? current : best;
    });
  }
}