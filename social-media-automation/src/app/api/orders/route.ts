import { NextRequest, NextResponse } from 'next/server';
import { FansGurusAPI, DataMonitor } from '@/lib/api';
import { AutoOrder } from '@/types';

// 模拟数据库存储
let autoOrders: AutoOrder[] = [];

export async function GET() {
  return NextResponse.json({ orders: autoOrders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetId, packageId, accountLink } = body;

    // 获取服务包信息
    const serviceResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/services`);
    const { services } = await serviceResponse.json();
    const selectedPackage = services.find((pkg: any) => pkg.id === packageId);

    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Service package not found' },
        { status: 404 }
      );
    }

    // 创建自动订单记录
    const newOrder: AutoOrder = {
      id: Date.now().toString(),
      targetId,
      packageId,
      status: 'pending',
      orderAmount: selectedPackage.price,
      createdAt: new Date(),
    };

    autoOrders.push(newOrder);

    try {
      // 调用 FansGurus API 创建实际订单
      const orderResult = await FansGurusAPI.createOrder(
        packageId,
        selectedPackage.quantity,
        accountLink
      );

      // 更新订单状态
      newOrder.status = 'processing';
      
      return NextResponse.json({ 
        order: newOrder,
        externalOrder: orderResult 
      }, { status: 201 });

    } catch (apiError) {
      // 外部API调用失败，记录错误
      newOrder.status = 'failed';
      newOrder.error = apiError instanceof Error ? apiError.message : 'Unknown API error';
      
      return NextResponse.json(
        { 
          error: 'Failed to create external order',
          order: newOrder 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    const orderIndex = autoOrders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = autoOrders[orderIndex];

    try {
      // 检查外部订单状态
      const statusResult = await FansGurusAPI.checkOrderStatus(orderId);
      
      // 更新本地订单状态
      if (statusResult.status === 'completed') {
        order.status = 'completed';
        order.completedAt = new Date();
      } else if (statusResult.status === 'processing') {
        order.status = 'processing';
      } else if (statusResult.status === 'failed') {
        order.status = 'failed';
        order.error = statusResult.error || 'Order failed';
      }

      return NextResponse.json({ 
        order,
        externalStatus: statusResult
      });

    } catch (apiError) {
      console.error('Status check error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to check order status',
          order
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Order status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}

// 自动下单逻辑端点
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { monitoringResults, availableServices } = body;

    const createdOrders: AutoOrder[] = [];

    for (const result of monitoringResults) {
      if (result.gapAnalysis?.needsAction) {
        // 推荐合适的服务包
        const recommendedPackage = await DataMonitor.recommendServicePackage(
          result.metric,
          result.gapAnalysis.difference,
          availableServices
        );

        if (recommendedPackage) {
          // 创建自动订单
          const autoOrder: AutoOrder = {
            id: Date.now().toString() + '_' + result.id,
            targetId: result.id,
            packageId: recommendedPackage.id,
            status: 'pending',
            orderAmount: recommendedPackage.price,
            createdAt: new Date(),
          };

          createdOrders.push(autoOrder);
          autoOrders.push(autoOrder);
        }
      }
    }

    return NextResponse.json({ 
      message: 'Auto orders created successfully',
      orders: createdOrders
    });

  } catch (error) {
    console.error('Auto order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create auto orders' },
      { status: 500 }
    );
  }
}