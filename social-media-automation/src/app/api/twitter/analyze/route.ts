import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// 验证JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  console.log('Authorization header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No Bearer token found');
    return null;
  }

  const token = authHeader.substring(7);
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Decoded token:', decoded);
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证JWT token
    const user = verifyToken(request);
    if (!user?.userId || !user?.email) {
      return NextResponse.json(
        { success: false, message: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, include_tweets = true, tweets_limit = 100 } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: '用户名不能为空' },
        { status: 400 }
      );
    }

    // 调用Python服务
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim().replace('@', ''),
        include_tweets,
        tweets_limit,
        include_followers: false,
        include_following: false
      })
    });

    if (!response.ok) {
      throw new Error(`Python服务请求失败: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Twitter分析请求失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '分析请求失败' 
      },
      { status: 500 }
    );
  }
}