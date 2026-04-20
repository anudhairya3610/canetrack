import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const shop = await prisma.shop.findFirst({
    where: { id: params.id, userId: session.userId },
    include: {
      bills: {
        include: { items: true, payments: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
  return NextResponse.json(shop);
}
