import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// 定义需要认证的路径
const protectedPaths = [
  '/api/x',
  '/api/growth-targets',
  '/api/social-accounts',
  '/api/wallet',
  '/api/auto-orders',
  '/api/analytics',
  '/dashboard'
];

// 定义公开路径
const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/auth',
  '/auth/x/callback',
  '/api/x/auth/callback', // OAuth回调需要公开
  '/',
  '/_next',
  '/favicon.ico'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否是公开路径
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 检查是否是受保护路径
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 获取Authorization头
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 对于API路径返回401，对于页面重定向到登录
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

  try {
    // 验证JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.userId) {
      throw new Error('Invalid token structure');
    }

    // 创建新的响应并添加用户ID到请求头
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-email', decoded.email);

    // 对于API请求，添加用户信息到响应头（可选）
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;

  } catch (error) {
    console.error('JWT verification error:', error);
    
    // Token无效或过期
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // 对于页面请求，重定向到登录页
    const response = NextResponse.redirect(new URL('/auth', request.url));
    
    // 清除客户端的无效token
    response.cookies.delete('token');
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};