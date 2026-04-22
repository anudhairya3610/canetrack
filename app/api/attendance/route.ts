export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { autoCreateExpense } from '@/lib/services/expense.service';
import { AttendanceStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { records } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No attendance records provided' }, { status: 400 });
    }

    // Validate all worker IDs belong to this user
    const workerIds = [...new Set(records.map((r: any) => r.workerId))];
    const workers = await prisma.worker.findMany({
      where: { id: { in: workerIds as string[] }, userId: session.userId },
      select: { id: true, name: true },
    });

    const validWorkerIds = new Set(workers.map(w => w.id));
    const workerNameMap = new Map(workers.map(w => [w.id, w.name]));

    // Filter out records for workers that don't belong to this user
    const validRecords = records.filter((r: any) => validWorkerIds.has(r.workerId));

    if (validRecords.length === 0) {
      return NextResponse.json({ error: 'No valid workers found' }, { status: 400 });
    }

    // Validate attendance status enum
    const validStatuses = Object.values(AttendanceStatus);

    const results = await prisma.$transaction(async (tx) => {
      const attendanceResults = [];

      for (const r of validRecords) {
        const dateObj = new Date(r.date);
        dateObj.setHours(12, 0, 0, 0);

        const status = validStatuses.includes(r.status) ? r.status : 'absent';
        const dailyWage = parseFloat(r.dailyWage) || 0;
        const paidToday = r.paidToday || false;
        const paidAmount = paidToday ? (parseFloat(r.paidAmount) || dailyWage) : 0;
        const overtimeHours = parseFloat(r.overtimeHours) || 0;
        const overtimeRate = parseFloat(r.overtimeRate) || 0;

        const attendance = await tx.attendance.upsert({
          where: { workerId_date: { workerId: r.workerId, date: dateObj } },
          update: {
            status,
            checkIn: r.checkIn || null,
            checkOut: r.checkOut || null,
            overtimeHours,
            overtimeRate,
            dailyWage,
            paidToday,
            paidAmount,
          },
          create: {
            workerId: r.workerId,
            date: dateObj,
            status,
            checkIn: r.checkIn || null,
            checkOut: r.checkOut || null,
            overtimeHours,
            overtimeRate,
            dailyWage,
            paidToday,
            paidAmount,
          },
        });

        // Auto-create expense if paid today and amount > 0
        if (paidToday && paidAmount > 0) {
          const workerName = workerNameMap.get(r.workerId) || 'Worker';

          // Check if expense already exists for this attendance
          const existingExpense = await tx.expense.findUnique({
            where: {
              sourceType_sourceId: {
                sourceType: 'attendance',
                sourceId: attendance.id,
              },
            },
          });

          if (existingExpense) {
            // Update existing expense amount (in case paidAmount changed)
            await tx.expense.update({
              where: { id: existingExpense.id },
              data: {
                amount: paidAmount,
                description: `${workerName} - daily wage (${status === 'halfDay' ? 'half day' : 'full day'})`,
                date: dateObj,
              },
            });
          } else {
            // Create new expense
            await autoCreateExpense(tx, {
              userId: session.userId,
              category: 'labour',
              sourceType: 'attendance',
              sourceId: attendance.id,
              amount: paidAmount,
              description: `${workerName} - daily wage (${status === 'halfDay' ? 'half day' : 'full day'})`,
              date: dateObj,
            });
          }
        } else {
          // If paidToday unchecked, delete any existing expense for this attendance
          const existingExpense = await tx.expense.findUnique({
            where: {
              sourceType_sourceId: {
                sourceType: 'attendance',
                sourceId: attendance.id,
              },
            },
          });

          if (existingExpense) {
            await tx.expense.delete({ where: { id: existingExpense.id } });
          }
        }

        attendanceResults.push(attendance);
      }

      return attendanceResults;
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('POST /api/attendance error:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate attendance record' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to save attendance' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('GET /api/attendance error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}