export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, password } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, name: user.name, village: user.village });

    const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, village: user.village } });
    res.cookies.set('canetrack-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  } catch (err: any) {
    console.error('LOGIN ERROR:', err?.message, err?.name);
    return NextResponse.json({
      error: err?.message || 'Server error',
      name: err?.name || 'Unknown'
    }, { status: 500 });
  }
}