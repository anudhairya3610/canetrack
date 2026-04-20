import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.userId;

  // Total expenses
  const expenses = await prisma.expense.findMany({ where: { userId }, select: { amount: true, category: true, date: true } });
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  // Harvest income (no price per quintal so we just return quantity)
  const harvest = await prisma.harvestEntry.findMany({
    where: { plot: { userId } },
    select: { quantityQtl: true, date: true },
  });
  const totalHarvestQtl = harvest.reduce((s, h) => s + h.quantityQtl, 0);

  // Active workers & dues
  const workers = await prisma.worker.findMany({
    where: { userId, isActive: true },
    include: {
      attendances: { where: { paidToday: false, status: 'present' }, select: { dailyWage: true } },
      advances: { where: { deducted: false }, select: { amount: true } },
    },
  });
  const activeWorkers = workers.length;
  const pendingDues = workers.reduce((s, w) => {
    const wages = w.attendances.reduce((ws, a) => ws + (a.dailyWage || 0), 0);
    const advances = w.advances.reduce((as, a) => as + a.amount, 0);
    return s + wages + advances;
  }, 0);

  // Total plots
  const totalPlots = await prisma.plot.count({ where: { userId } });

  // Recent activities (last 5)
  const recentActivities = await prisma.activity.findMany({
    where: { plot: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { plot: { select: { name: true } } },
  });

  // Upcoming reminders (next 7 days)
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

  // Monthly expense data (last 6 months)
  const monthlyData: { month: string; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthExpenses = expenses
      .filter(e => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
      .reduce((s, e) => s + e.amount, 0);
    monthlyData.push({
      month: monthStart.toLocaleString('hi-IN', { month: 'short' }),
      expense: monthExpenses,
    });
  }

  // Category breakdown for pie chart
  const categoryMap: Record<string, number> = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  return NextResponse.json({
    totalExpense,
    totalHarvestQtl,
    activeWorkers,
    pendingDues,
    totalPlots,
    recentActivities,
    upcomingReminders,
    monthlyData,
    categoryBreakdown,
  });
}
