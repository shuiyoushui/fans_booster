import { User, Wallet } from '@/types';

// 模拟数据库存储
export let users: User[] = [];
export let wallets: Wallet[] = [];
export let sessions: any[] = [];

// 初始化测试数据
export function initializeTestData() {
  // 测试用户
  users = [
    {
      id: '1',
      email: 'test@example.com',
      passwordHash: '$2b$10$tU7j/kzHar/9eiBEWY.BK.k2CetFws.ZrbxiCzqh2FrBlwgztUjta', // password123
      firstName: '测试',
      lastName: '用户',
      isActive: true,
      emailVerified: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }
  ];

  // 测试钱包
  wallets = [
    {
      id: '1_wallet',
      userId: '1',
      balance: 100.50,
      currency: 'USDT',
      address: '0x1234567890123456789012345678901234567890',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    }
  ];
}

// 初始化
initializeTestData();