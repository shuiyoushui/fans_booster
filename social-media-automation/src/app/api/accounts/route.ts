import { NextRequest, NextResponse } from 'next/server';
import { SocialAccount } from '@/types';

// 模拟数据库存储
let accounts: SocialAccount[] = [];

export async function GET() {
  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newAccount: SocialAccount = {
      id: Date.now().toString(),
      platform: body.platform,
      username: body.username,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    accounts.push(newAccount);
    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const accountIndex = accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    accounts[accountIndex] = {
      ...accounts[accountIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return NextResponse.json({ account: accounts[accountIndex] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const accountIndex = accounts.findIndex(acc => acc.id === id);
    if (accountIndex === -1) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    accounts.splice(accountIndex, 1);
    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}