import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// 验证JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    // 验证JWT token
    const user = verifyToken(request);
    if (!user?.userId || !user?.email) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const username = params.username;

    if (!username) {
      return NextResponse.json(
        { success: false, message: '用户名不能为空' },
        { status: 400 }
      );
    }

    // 调用Python服务
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/user/${username.trim().replace('@', '')}`);

    if (!response.ok) {
      throw new Error(`Python服务请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('获取用户数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '获取用户数据失败' 
      },
      { status: 500 }
    );
  }
}