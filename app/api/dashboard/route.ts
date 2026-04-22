export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getExpenseTotal, getExpensesByCategory } from '@/lib/services/expense.service';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId;

    // ============ EXPENSES ============

    // Total expenses (from Expense table via service)
    const totalExpense = await getExpenseTotal(userId);

    // Category breakdown (from Expense table via service)
    const categoryData = await getExpensesByCategory(userId);
    const categoryBreakdown = categoryData.map((c) => ({
      name: c.category,
      value: c._sum.amount || 0,
      count: c._count,
    }));

    // Monthly expense data (last 6 months)
    const monthlyData: { month: string; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthTotal = await prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      monthlyData.push({
        month: monthStart.toLocaleString('hi-IN', { month: 'short' }),
        expense: monthTotal._sum.amount || 0,
      });
    }

    // ============ HARVEST ============

    const harvest = await prisma.harvestEntry.findMany({
      where: { plot: { userId } },
      select: { quantityQtl: true },
    });
    const totalHarvestQtl = harvest.reduce((s, h) => s + h.quantityQtl, 0);

    // ============ WORKERS ============

    const workers = await prisma.worker.findMany({
      where: { userId, isActive: true },
      include: {
        attendances: {
          where: { paidToday: false, status: 'present' },
          select: { dailyWage: true },
        },
        advances: {
          where: { deducted: false },
          select: { amount: true },
        },
      },
    });

    const activeWorkers = workers.length;
    const pendingWages = workers.reduce(
      (s, w) => s + w.attendances.reduce((ws, a) => ws + (a.dailyWage || 0), 0),
      0
    );
    const pendingAdvances = workers.reduce(
      (s, w) => s + w.advances.reduce((as, a) => as + a.amount, 0),
      0
    );

    // ============ PLOTS ============

    const totalPlots = await prisma.plot.count({ where: { userId } });

    // ============ BILLS ============

    const billSummary = await prisma.bill.aggregate({
      where: { shop: { userId }, paymentStatus: { in: ['credit', 'partial'] } },
      _sum: { dueAmount: true },
      _count: true,
    });

    // ============ RECENT ACTIVITIES ============

    const recentActivities = await prisma.activity.findMany({
      where: { plot: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { plot: { select: { name: true } } },
    });

    // ============ UPCOMING REMINDERS ============

    const upcomingReminders = await prisma.reminder.findMany({
      where: {
        userId,
        isCompleted: false,
        dueDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { plot: { select: { name: true } } },
    });

    return NextResponse.json({
      // Summary cards
      totalExpense,
      totalHarvestQtl,
      activeWorkers,
      pendingWages,
      pendingAdvances,
      pendingDues: pendingWages + pendingAdvances, // backward compatible
      totalPlots,

      // Bill dues
      unpaidBills: billSummary._count || 0,
      totalBillDue: billSummary._sum.dueAmount || 0,

      // Charts
      monthlyData,
      categoryBreakdown,

      // Lists
      recentActivities,
      upcomingReminders,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}