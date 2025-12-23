import { NextRequest, NextResponse } from 'next/server';
import { AutoOrder, GrowthTarget, FansGurusService } from '@/types';

// 模拟数据库存储
let autoOrders: AutoOrder[] = [];

// FansGurus API 配置 (使用模拟配置，实际应从环境变量获取)
const FANS_GURUS_CONFIG = {
  apiUrl: process.env.FANS_GURUS_API_URL || 'https://api.fansgurus.com/v1',
  apiKey: process.env.FANS_GURUS_API_KEY || 'test_api_key',
  supportedPlatforms: ['x', 'instagram', 'tiktok', 'youtube']
};

// 模拟 FansGurus 服务数据
const mockFansGurusServices: FansGurusService[] = [
  {
    id: 'followers_1000',
    name: '1000 Followers Package',
    type: 'followers',
    platform: 'x',
    category: 'premium',
    rate: 0.05,
    min: 100,
    max: 10000,
    dripfeed: true,
    averageTime: '1-3 days'
  },
  {
    id: 'likes_500',
    name: '500 Likes Package',
    type: 'likes',
    platform: 'x',
    category: 'standard',
    rate: 0.001,
    min: 50,
    max: 50000,
    dripfeed: false,
    averageTime: '1-2 hours'
  },
  {
    id: 'comments_100',
    name: '100 Comments Package',
    type: 'comments',
    platform: 'x',
    category: 'premium',
    rate: 0.01,
    min: 10,
    max: 10000,
    dripfeed: false,
    averageTime: '1-2 hours'
  },
  {
    id: 'views_10000',
    name: '10K Views Package',
    type: 'views',
    platform: 'x',
    category: 'standard',
    rate: 0.0001,
    min: 1000,
    max: 1000000,
    dripfeed: false,
    averageTime: '30 minutes'
  },
  {
    id: 'shares_500',
    name: '500 Shares Package',
    type: 'shares',
    platform: 'x',
    category: 'standard',
    rate: 0.008,
    min: 50,
    max: 50000,
    dripfeed: false,
    averageTime: '2-4 hours'
  }
];

// 获取 FansGurus 服务列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const platform = searchParams.get('platform');

    let services = mockFansGurusServices;

    // 按类型筛选
    if (type) {
      services = services.filter(s => s.type === type);
    }

    // 按平台筛选
    if (platform) {
      services = services.filter(s => s.platform === platform);
    }

    return NextResponse.json({
      services: services.sort((a, b) => a.rate - b.rate)
    });

  } catch (error) {
    console.error('Get fans gurus services error:', error);
    return NextResponse.json(
      { error: '获取服务列表失败' },
      { status: 500 }
    );
  }
}

// 创建自动订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      targetId,
      accountId, // 可选
      serviceType,
      quantity,
      commentTemplates, // 评论专用
      packageId
    } = body;

    // 验证必填字段
    if (!userId || !targetId || !serviceType || !quantity) {
      return NextResponse.json(
        { error: '用户ID、目标ID、服务类型和数量都是必需的' },
        { status: 400 }
      );
    }

    // 验证数量
    if (quantity <= 0) {
      return NextResponse.json(
        { error: '数量必须大于0' },
        { status: 400 }
      );
    }

    // 查找合适的 FansGurus 服务
    let selectedService: FansGurusService | undefined;
    if (packageId) {
      selectedService = mockFansGurusServices.find(s => s.id === packageId);
    } else {
      // 根据服务类型和数量自动选择最合适的服务
      selectedService = mockFansGurusServices.find(s => 
        s.type === serviceType && 
        quantity >= s.min && 
        quantity <= s.max
      );
    }

    if (!selectedService) {
      return NextResponse.json(
        { error: '未找到适合的服务套餐' },
        { status: 400 }
      );
    }

    // 验证评论内容（如果是评论服务）
    if (serviceType === 'comments' && (!commentTemplates || commentTemplates.length === 0)) {
      return NextResponse.json(
        { error: '评论服务需要提供评论内容' },
        { status: 400 }
      );
    }

    // 计算费用
    const unitPrice = selectedService.rate;
    const totalAmount = quantity * unitPrice;

    // 调用 FansGurus API 创建订单（模拟）
    const externalOrderId = await createFansGurusOrder({
      serviceId: selectedService.id,
      quantity,
      link: `https://example.com/account/${accountId}`, // 模拟链接
      comments: commentTemplates
    });

    // 创建自动订单记录
    const newOrder: AutoOrder = {
      id: Date.now().toString(),
      targetId,
      accountId: accountId || undefined,
      serviceType: serviceType as any,
      quantity,
      packageId: selectedService.id,
      status: 'pending',
      unitPrice,
      totalAmount,
      currency: 'USDT',
      externalOrderId,
      serviceDetails: {
        name: selectedService.name,
        platform: selectedService.platform,
        estimatedTime: selectedService.averageTime,
        minQuantity: selectedService.min,
        maxQuantity: selectedService.max
      },
      commentTemplates: serviceType === 'comments' ? commentTemplates : undefined,
      createdAt: new Date(),
    };

    autoOrders.push(newOrder);

    return NextResponse.json({ 
      order: newOrder,
      message: '自动订单创建成功'
    }, { status: 201 });

  } catch (error) {
    console.error('Create auto order error:', error);
    return NextResponse.json(
      { error: '创建自动订单失败' },
      { status: 500 }
    );
  }
}

// 更新订单状态
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, ...updates } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: '订单ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const orderIndex = autoOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: '未找到自动订单' },
        { status: 404 }
      );
    }

    // 验证权限（这里简化处理）
    // 实际应该检查订单关联的目标是否属于该用户

    // 更新订单
    autoOrders[orderIndex] = {
      ...autoOrders[orderIndex],
      ...updates,
    };

    // 如果状态变为已完成，设置完成时间
    if (updates.status === 'completed' && !autoOrders[orderIndex].completedAt) {
      autoOrders[orderIndex].completedAt = new Date();
    }

    return NextResponse.json({ 
      order: autoOrders[orderIndex],
      message: '订单状态更新成功'
    });

  } catch (error) {
    console.error('Update auto order error:', error);
    return NextResponse.json(
      { error: '更新自动订单失败' },
      { status: 500 }
    );
  }
}

// 获取订单列表
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetId = searchParams.get('targetId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    let orders = autoOrders;

    // 按用户筛选（需要通过目标关联）
    if (userId) {
      // 这里简化处理，实际应该通过目标ID关联
      orders = orders.filter(order => {
        // 假设订单ID包含目标ID信息
        return order.targetId.includes(userId.substring(0, 8));
      });
    }

    // 按目标筛选
    if (targetId) {
      orders = orders.filter(order => order.targetId === targetId);
    }

    // 按状态筛选
    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    return NextResponse.json({ 
      orders: orders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });

  } catch (error) {
    console.error('Get auto orders error:', error);
    return NextResponse.json(
      { error: '获取自动订单失败' },
      { status: 500 }
    );
  }
}

// 删除/取消订单
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: '订单ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const orderIndex = autoOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: '未找到自动订单' },
        { status: 404 }
      );
    }

    const order = autoOrders[orderIndex];

    // 只能取消 pending 状态的订单
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: '只能取消待处理状态的订单' },
        { status: 400 }
      );
    }

    // 软删除：标记为已取消
    autoOrders[orderIndex].status = 'cancelled';

    // 调用 FansGurus API 取消订单（模拟）
    if (order.externalOrderId) {
      await cancelFansGurusOrder(order.externalOrderId);
    }

    return NextResponse.json({ 
      message: '订单已取消'
    });

  } catch (error) {
    console.error('Cancel auto order error:', error);
    return NextResponse.json(
      { error: '取消自动订单失败' },
      { status: 500 }
    );
  }
}

// FansGurus API 集成函数（模拟实现）
async function createFansGurusOrder(orderData: any): Promise<string> {
  try {
    console.log('调用 FansGurus API 创建订单:', orderData);
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 返回模拟的外部订单ID
    return `FG_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  } catch (error) {
    console.error('FansGurus API error:', error);
    throw new Error('外部服务调用失败');
  }
}

async function cancelFansGurusOrder(externalOrderId: string): Promise<void> {
  try {
    console.log('调用 FansGurus API 取消订单:', externalOrderId);
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('FansGurus cancel error:', error);
    throw new Error('取消外部订单失败');
  }
}

// 订单状态同步函数（可用于定期同步 FansGurus 订单状态）
export async function syncOrderStatus(orderId: string) {
  try {
    const order = autoOrders.find(o => o.id === orderId);
    if (!order || !order.externalOrderId) {
      return;
    }

    // 调用 FansGurus API 获取订单状态（模拟）
    const externalStatus = await getFansGurusOrderStatus(order.externalOrderId);
    
    // 映射外部状态到内部状态
    const statusMapping: { [key: string]: AutoOrder['status'] } = {
      'pending': 'pending',
      'processing': 'processing', 
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    };

    const newStatus = statusMapping[externalStatus] || 'pending';
    
    // 更新订单状态
    if (order.status !== newStatus) {
      order.status = newStatus;
      if (newStatus === 'completed') {
        order.completedAt = new Date();
      }
    }

    return order;
  } catch (error) {
    console.error('Sync order status error:', error);
    return null;
  }
}

async function getFansGurusOrderStatus(externalOrderId: string): Promise<string> {
  // 模拟 API 调用
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 返回模拟状态
  const statuses = ['pending', 'processing', 'completed', 'failed'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}