import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/auth/me — return current user profile
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, village: true, language: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/auth/me — update name and village
export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, village } = body;

  if (!name || !village) {
    return NextResponse.json({ error: 'Name and village are required' }, { status: 400 });
  }

  // Check if name is taken by another user
  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing && existing.id !== session.userId) {
    return NextResponse.json({ error: 'Name already taken' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { name, village },
    select: { id: true, name: true, village: true, language: true },
  });

  // Refresh the JWT cookie with new name/village
  const token = signToken({ userId: updated.id, name: updated.name, village: updated.village });
  const res = NextResponse.json({ success: true, user: updated });
  res.cookies.set('canetrack-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return res;
}
