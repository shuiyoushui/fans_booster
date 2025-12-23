import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  const password = 'password123';
  const hash = '$2b$10$tU7j/kzHar/9eiBEWY.BK.k2CetFws.ZrbxiCzqh2FrBlwgztUjta';
  
  try {
    const isValid = await bcrypt.compare(password, hash);
    return NextResponse.json({
      password,
      hash,
      isValid,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}