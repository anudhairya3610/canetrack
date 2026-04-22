export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
  } catch (error: any) {
    console.error('Shops GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Validate required field
    if (!body.shopName || !body.shopName.trim()) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    const shop = await prisma.shop.create({
      data: {
        userId: session.userId,
        shopName: body.shopName.trim(),
        ownerName: body.ownerName || null,
        phone: body.phone || null,
        address: body.address || null,
        shopType: body.shopType || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(shop);
  } catch (error: any) {
    console.error('Shop POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shop' },
      { status: 500 }
    );
  }
}