import { NextRequest, NextResponse } from 'next/server';
import { Wallet, Transaction } from '@/types';

// 模拟数据库存储
let wallets: Wallet[] = [];
let transactions: Transaction[] = [];

// 获取用户钱包信息
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

    const wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
      return NextResponse.json(
        { error: '未找到钱包信息' },
        { status: 404 }
      );
    }

    // 获取交易历史
    const userTransactions = transactions.filter(t => t.userId === userId);

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        address: wallet.address,
      },
      transactions: userTransactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json(
      { error: '获取钱包信息失败' },
      { status: 500 }
    );
  }
}

// 创建充值记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: '用户ID和充值金额是必需的' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: '充值金额必须大于0' },
        { status: 400 }
      );
    }

    // 查找用户钱包
    const wallet = wallets.find(w => w.userId === userId);
    if (!wallet) {
      return NextResponse.json(
        { error: '未找到钱包信息' },
        { status: 404 }
      );
    }

    // 创建充值交易记录
    const transaction: Transaction = {
      id: Date.now().toString(),
      userId,
      type: 'deposit',
      amount,
      status: 'pending',
      description: `USDT充值 ${amount}`,
      createdAt: new Date(),
    };

    transactions.push(transaction);

    // 生成充值地址（实际应用中应该使用真实的支付网关）
    const depositAddress = generateDepositAddress(transaction.id);

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        depositAddress,
        description: transaction.description,
      },
      message: '充值记录已创建，请向指定地址转账'
    }, { status: 201 });

  } catch (error) {
    console.error('Create deposit error:', error);
    return NextResponse.json(
      { error: '创建充值记录失败' },
      { status: 500 }
    );
  }
}

// 确认充值（模拟区块链确认）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, txHash } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: '交易ID是必需的' },
        { status: 400 }
      );
    }

    // 查找交易记录
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      return NextResponse.json(
        { error: '未找到交易记录' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: '该交易已经处理过了' },
        { status: 400 }
      );
    }

    // 查找用户钱包
    const wallet = wallets.find(w => w.userId === transaction.userId);
    if (!wallet) {
      return NextResponse.json(
        { error: '未找到钱包信息' },
        { status: 404 }
      );
    }

    // 更新交易状态
    transaction.status = 'completed';
    transaction.txHash = txHash;
    transaction.completedAt = new Date();

    // 更新钱包余额
    wallet.balance += transaction.amount;
    wallet.updatedAt = new Date();

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        txHash: transaction.txHash,
        completedAt: transaction.completedAt,
      },
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
      message: '充值确认成功'
    });

  } catch (error) {
    console.error('Confirm deposit error:', error);
    return NextResponse.json(
      { error: '确认充值失败' },
      { status: 500 }
    );
  }
}

// 生成充值地址的函数
function generateDepositAddress(transactionId: string): string {
  // 实际应用中应该使用真实的区块链地址或支付网关
  return `usdt_${transactionId}_${Date.now()}`;
}