import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径，不需要认证
  const publicPaths = ['/auth', '/api/auth/login', '/api/auth/register'];
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 检查是否是API路径
  if (pathname.startsWith('/api/')) {
    // 对于API路径，验证Authorization头
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供有效的认证令牌' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (jwtError) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }
  }

  // 对于页面路径，检查localStorage中的token
  if (pathname.startsWith('/dashboard') || pathname === '/') {
    // 由于中间件无法访问localStorage，这里只做简单重定向
    // 实际的认证检查在页面组件中进行
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};