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

    const userId = session.userId;

    const plots = await prisma.plot.findMany({
      where: { userId },
      include: {
        expenses: { select: { amount: true, category: true } },
        harvestEntries: { select: { quantityQtl: true } },
      },
    });

    const workers = await prisma.worker.findMany({
      where: { userId },
      include: {
        attendances: { select: { dailyWage: true, paidToday: true, paidAmount: true } },
        payments: { select: { amount: true } },
        advances: { select: { amount: true, deducted: true } },
      },
    });

    const plotReports = plots.map(p => {
      const totalExpense = p.expenses.reduce((s, e) => s + e.amount, 0);
      const totalYield = p.harvestEntries.reduce((s, h) => s + h.quantityQtl, 0);
      return {
        id: p.id, name: p.name, areaBigha: p.areaBigha, variety: p.variety,
        status: p.status, totalExpense, totalYield,
        costPerBigha: p.areaBigha > 0 ? totalExpense / p.areaBigha : 0,
        yieldPerBigha: p.areaBigha > 0 ? totalYield / p.areaBigha : 0,
      };
    });

    const labourReports = workers.map(w => {
      const totalEarned = w.attendances.reduce((s, a) => s + (a.dailyWage || 0), 0);
      const totalPaid = w.payments.reduce((s, p) => s + p.amount, 0) + w.attendances.filter(a => a.paidToday).reduce((s, a) => s + (a.paidAmount || 0), 0);
      const totalAdvances = w.advances.reduce((s, a) => s + a.amount, 0);
      const pendingDues = totalEarned - totalPaid + totalAdvances;
      return { id: w.id, name: w.name, totalEarned, totalPaid, totalAdvances, pendingDues };
    });

    return NextResponse.json({ plotReports, labourReports });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
