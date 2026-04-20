import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plotId = searchParams.get('plotId');

  const entries = await prisma.harvestEntry.findMany({
    where: { plot: { userId: session.userId }, ...(plotId ? { plotId } : {}) },
    include: { plot: { select: { name: true, areaBigha: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const entry = await prisma.harvestEntry.create({
    data: {
      plotId: body.plotId,
      date: new Date(body.date),
      quantityQtl: parseFloat(body.quantityQtl),
      vehicleNumber: body.vehicleNumber || null,
      tokenNumber: body.tokenNumber || null,
      millName: body.millName || null,
      harvesterType: body.harvesterType || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(entry);
}
