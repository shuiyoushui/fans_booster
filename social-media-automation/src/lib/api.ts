import { SocialAccount, MonitoringTarget, ServicePackage, AutoOrder, MonitoringResult } from '@/types';

// FansGurus API 配置
const FANSGURUS_API_BASE = 'https://fansgurus.com/api';
const FANSGURUS_API_KEY = process.env.FANSGURUS_API_KEY || '';

export class FansGurusAPI {
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
      throw error;
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