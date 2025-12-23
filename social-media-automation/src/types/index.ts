export interface SocialAccount {
  id: string;
  platform: 'x' | 'instagram' | 'tiktok' | 'youtube';
  username: string;
  accessToken?: string;
  refreshToken?: string;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoringTarget {
  id: string;
  accountId: string;
  metric: 'followers' | 'engagement' | 'views' | 'likes';
  targetValue: number;
  currentValue: number;
  tolerancePercentage: number;
  autoOrderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServicePackage {
  id: string;
  name: string;
  type: 'followers' | 'likes' | 'views' | 'comments';
  platform: string;
  quantity: number;
  price: number;
  estimatedTime: string;
  isActive: boolean;
}

export interface AutoOrder {
  id: string;
  targetId: string;
  packageId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  orderAmount: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface MonitoringResult {
  id: string;
  accountId: string;
  metric: string;
  value: number;
  recordedAt: Date;
  gapAnalysis?: {
    difference: number;
    percentageGap: number;
    needsAction: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: 'USDT';
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'payment';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  txHash?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface GrowthTarget {
  id: string;
  userId: string;
  accountId: string;
  targetMetric: 'followers' | 'likes' | 'views' | 'comments';
  targetValue: number;
  currentValue: number;
  deadline: Date;
  autoOrderEnabled: boolean;
  budgetLimit?: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
  expiresAt: Date;
}