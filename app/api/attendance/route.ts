import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { records } = await req.json();
  // records: [{ workerId, date, status, checkIn, checkOut, overtimeHours, overtimeRate, dailyWage, paidToday, paidAmount }]

  const results = await Promise.all(
    records.map(async (r: {
      workerId: string; date: string; status: string; checkIn?: string; checkOut?: string;
      overtimeHours?: number; overtimeRate?: number; dailyWage?: number; paidToday?: boolean; paidAmount?: number;
    }) => {
      const dateObj = new Date(r.date);
      dateObj.setHours(12, 0, 0, 0);

      return prisma.attendance.upsert({
        where: { workerId_date: { workerId: r.workerId, date: dateObj } },
        update: {
          status: r.status,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          overtimeHours: r.overtimeHours || 0,
          overtimeRate: r.overtimeRate || 0,
          dailyWage: r.dailyWage || 0,
          paidToday: r.paidToday || false,
          paidAmount: r.paidAmount || 0,
        },
        create: {
          workerId: r.workerId,
          date: dateObj,
          status: r.status,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          overtimeHours: r.overtimeHours || 0,
          overtimeRate: r.overtimeRate || 0,
          dailyWage: r.dailyWage || 0,
          paidToday: r.paidToday || false,
          paidAmount: r.paidAmount || 0,
        },
      });
    })
  );

  return NextResponse.json({ success: true, count: results.length });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const dateObj = new Date(dateStr);
  dateObj.setHours(12, 0, 0, 0);

  const workers = await prisma.worker.findMany({
    where: { userId: session.userId, isActive: true },
    include: {
      attendances: {
        where: {
          date: {
            gte: new Date(dateObj.getTime() - 12 * 60 * 60 * 1000),
            lte: new Date(dateObj.getTime() + 12 * 60 * 60 * 1000),
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(workers);
}
