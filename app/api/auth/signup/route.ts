import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, village, password } = await req.json();
    if (!name || !village || !password) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, village, password: hashed },
    });

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
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
