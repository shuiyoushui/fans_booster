export interface SocialAccount {
  id: string;
  platform: 'x' | 'instagram' | 'tiktok' | 'youtube';
  username: string;
  accessToken?: string;
  refreshToken?: string;
  isActive: boolean;
  lastSync?: Date;
  // 新增运营数据字段
  currentMetrics: {
    followers: number;
    likes: number;
    views: number;
    comments: number;
    shares: number;
  };
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
  accountId?: string; // 可选
  serviceType: 'followers' | 'likes' | 'views' | 'comments' | 'shares';
  quantity: number;
  packageId?: string; // FansGurus 套餐ID
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  unitPrice: number;
  totalAmount: number;
  currency: 'USDT';
  // FansGurus API相关字段
  externalOrderId?: string;
  serviceDetails?: {
    name: string;
    platform: string;
    estimatedTime: string;
    minQuantity: number;
    maxQuantity: number;
  };
  // 评论相关字段
  commentTemplates?: string[];
  customComments?: string[];
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface MonitoringResult {
  id: string;
  accountId?: string; // 可选，支持无账号监控
  targetId: string; // 关联到增长目标
  metric: string;
  value: number;
  recordedAt: Date;
  gapAnalysis?: {
    difference: number;
    percentageGap: number;
    needsAction: boolean;
    suggestedOrders?: OrderSuggestion[]; // 拆解的订单建议
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
  accountId?: string; // 可选，支持无账号创建目标
  targetMetric: 'followers' | 'likes' | 'views' | 'comments' | 'shares';
  targetValue: number;
  currentValue: number;
  deadline: Date;
  autoOrderEnabled: boolean;
  budgetLimit?: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  commentTemplates?: string[]; // 自定义评论内容集
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentTemplate {
  id: string;
  userId: string;
  name: string;
  category: 'general' | 'positive' | 'engaging' | 'custom';
  templates: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSuggestion {
  serviceType: 'followers' | 'likes' | 'views' | 'comments' | 'shares';
  requiredQuantity: number;
  estimatedCost: number;
  recommendedPackages: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    estimatedTime: string;
  }[];
}

export interface FansGurusService {
  id: string;
  name: string;
  type: 'followers' | 'likes' | 'views' | 'comments' | 'shares';
  platform: string;
  category: string;
  rate: number; // 每单位价格
  min: number;
  max: number;
  dripfeed: boolean;
  averageTime: string;
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