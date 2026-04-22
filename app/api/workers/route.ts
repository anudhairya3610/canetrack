export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WorkerType, WageRateType } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workers = await prisma.worker.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        attendances: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        },
        payments: { orderBy: { date: 'desc' }, take: 10 },
        advances: { where: { deducted: false } },
      },
    });

    return NextResponse.json(workers);
  } catch (error: any) {
    console.error('Workers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, phone, workerType, wageRateType, wageAmount } = await req.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Worker name is required' }, { status: 400 });
    }

    const parsedWage = parseFloat(wageAmount);
    if (isNaN(parsedWage) || parsedWage <= 0) {
      return NextResponse.json({ error: 'Valid wage amount is required' }, { status: 400 });
    }

    // Validate enums
    const validWorkerTypes = Object.values(WorkerType);
    const validWageTypes = Object.values(WageRateType);

    const finalWorkerType = validWorkerTypes.includes(workerType as WorkerType)
      ? (workerType as WorkerType)
      : WorkerType.daily;

    const finalWageType = validWageTypes.includes(wageRateType as WageRateType)
      ? (wageRateType as WageRateType)
      : WageRateType.daily;

    const worker = await prisma.worker.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        phone: phone || null,
        workerType: finalWorkerType,
        wageRateType: finalWageType,
        wageAmount: parsedWage,
      },
    });

    return NextResponse.json(worker);
  } catch (error: any) {
    console.error('Worker POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create worker' },
      { status: 500 }
    );
  }
}