import { NextRequest, NextResponse } from 'next/server';
import { FansGurusAPI } from '@/lib/api';
import { ServicePackage } from '@/types';

// 模拟数据库存储
let servicePackages: ServicePackage[] = [];

export async function GET() {
  try {
    // 尝试从 FansGurus API 获取服务
    const externalServices = await FansGurusAPI.getServices();
    
    // 如果外部API可用，使用外部数据
    if (externalServices && externalServices.length > 0) {
      const formattedServices: ServicePackage[] = externalServices.map((service: any) => ({
        id: service.id.toString(),
        name: service.name,
        type: service.category,
        platform: service.service,
        quantity: service.min || 100,
        price: service.rate,
        estimatedTime: service.time || '24-48 hours',
        isActive: true,
      }));
      
      return NextResponse.json({ services: formattedServices });
    }

    // 否则使用模拟数据
    const mockServices: ServicePackage[] = [
      {
        id: '1',
        name: 'X Followers Basic',
        type: 'followers',
        platform: 'x',
        quantity: 100,
        price: 5.99,
        estimatedTime: '24-48 hours',
        isActive: true,
      },
      {
        id: '2',
        name: 'X Followers Pro',
        type: 'followers',
        platform: 'x',
        quantity: 500,
        price: 24.99,
        estimatedTime: '48-72 hours',
        isActive: true,
      },
      {
        id: '3',
        name: 'X Likes Package',
        type: 'likes',
        platform: 'x',
        quantity: 1000,
        price: 8.99,
        estimatedTime: '12-24 hours',
        isActive: true,
      },
      {
        id: '4',
        name: 'X Views Boost',
        type: 'views',
        platform: 'x',
        quantity: 5000,
        price: 12.99,
        estimatedTime: '6-12 hours',
        isActive: true,
      },
    ];

    return NextResponse.json({ services: mockServices });
  } catch (error) {
    console.error('Failed to fetch services:', error);
    
    // 返回模拟数据作为降级方案
    const fallbackServices: ServicePackage[] = [
      {
        id: '1',
        name: 'X Followers Basic',
        type: 'followers',
        platform: 'x',
        quantity: 100,
        price: 5.99,
        estimatedTime: '24-48 hours',
        isActive: true,
      },
    ];

    return NextResponse.json({ services: fallbackServices });
  }
}