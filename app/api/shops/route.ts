import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const shops = await prisma.shop.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      bills: {
        select: { finalAmount: true, paidAmount: true, dueAmount: true },
      },
    },
  });

  return NextResponse.json(shops);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const shop = await prisma.shop.create({
    data: {
      userId: session.userId,
      shopName: body.shopName,
      ownerName: body.ownerName || null,
      phone: body.phone || null,
      address: body.address || null,
      shopType: body.shopType || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(shop);
}
