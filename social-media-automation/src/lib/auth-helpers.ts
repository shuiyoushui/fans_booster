import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * 获取JWT密钥
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'fallback-secret-change-in-production') {
    console.warn('JWT_SECRET not configured or using fallback value. Please set a proper JWT_SECRET in production.');
  }
  return secret || 'fallback-secret-change-in-production';
}

/**
 * 从请求中提取并验证JWT token
 * @param request Next.js请求对象
 * @returns 认证用户信息或null（如果认证失败）
 */
export function authenticateRequest(request: NextRequest): AuthenticatedUser | null {
  const authHeader = request.headers.get('authorization');
  
  console.log('Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No Bearer token found in Authorization header');
    return null;
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
  console.log('Token extracted, length:', token.length);

  try {
    const jwtSecret = getJWTSecret();
    console.log('JWT verification with secret length:', jwtSecret.length);
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    console.log('JWT decoded successfully:', { 
      userId: decoded.userId, 
      email: decoded.email,
      exp: decoded.exp,
      iat: decoded.iat
    });

    if (!decoded || !decoded.userId) {
      console.log('Invalid JWT payload: missing userId');
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('JWT error name:', error instanceof Error ? error.name : 'Unknown');
    
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Token expired at:', error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('Invalid JWT format or signature');
    }
    
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
    console.log('Authentication failed - returning 401');
    return {
      error: {
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.',
        code: 'UNAUTHORIZED'
      },
      status: 401
    };
  }

  console.log('Authentication successful for user:', user.userId);
  return { user };
}

/**
 * 生成JWT token
 * @param payload JWT载荷
 * @returns JWT字符串
 */
export function generateToken(payload: { userId: string; email: string }): string {
  const jwtSecret = getJWTSecret();
  return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
}

/**
 * 验证JWT token（不依赖请求）
 * @param token JWT字符串
 * @returns 解码后的载荷或null
 */
export function verifyToken(token: string): any {
  try {
    const jwtSecret = getJWTSecret();
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}