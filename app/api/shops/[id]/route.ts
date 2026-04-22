import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const shop = await prisma.shop.findFirst({
      where: { id, userId: session.userId },
      include: {
        bills: {
          include: {
            items: true,
            payments: { orderBy: { date: 'desc' } },
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json(shop);
  } catch (error: any) {
    console.error('Shop detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shop details' },
      { status: 500 }
    );
  }
}