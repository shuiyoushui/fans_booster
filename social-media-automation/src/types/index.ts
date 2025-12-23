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