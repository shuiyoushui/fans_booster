import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * 从请求中提取并验证JWT token
 * @param request Next.js请求对象
 * @returns 认证用户信息或null（如果认证失败）
 */
export function authenticateRequest(request: NextRequest): AuthenticatedUser | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.userId) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * 验证请求并返回用户信息，如果验证失败则返回错误响应
 * @param request Next.js请求对象
 * @returns 用户信息或错误响应
 */
export function requireAuth(request: NextRequest): { user: AuthenticatedUser } | { error: any; status: number } {
  const user = authenticateRequest(request);
  
  if (!user) {
    return {
      error: {
        success: false,
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      },
      status: 401
    };
  }

  return { user };
}