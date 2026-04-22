import { prisma } from '@/lib/prisma';
import { ExpenseCategory, ExpenseSource } from '@prisma/client';

// ============ TYPES ============

interface CreateExpenseInput {
    userId: string;
    plotId?: string | null;
    shopId?: string | null;
    billId?: string | null;
    category: ExpenseCategory;
    sourceType?: ExpenseSource;
    sourceId?: string | null;
    amount: number;
    description?: string | null;
    date: Date;
    receiptUrl?: string | null;
    isRecurring?: boolean;
    recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
}

interface UpdateExpenseInput {
    amount?: number;
    description?: string | null;
    date?: Date;
    category?: ExpenseCategory;
    plotId?: string | null;
}

// ============ VALIDATION ============

function validateAmount(amount: number): void {
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number');
    }
    if (amount > 99999999) {
        throw new Error('Amount is too large');
    }
}

function validateCategory(category: string): ExpenseCategory {
    const valid = Object.values(ExpenseCategory);
    if (!valid.includes(category as ExpenseCategory)) {
        throw new Error(`Invalid category. Must be one of: ${valid.join(', ')}`);
    }
    return category as ExpenseCategory;
}

function validateSourceType(sourceType: string): ExpenseSource {
    const valid = Object.values(ExpenseSource);
    if (!valid.includes(sourceType as ExpenseSource)) {
        throw new Error(`Invalid sourceType. Must be one of: ${valid.join(', ')}`);
    }
    return sourceType as ExpenseSource;
}

// ============ SERVICE FUNCTIONS ============

// Create expense (used by manual + auto-creation)
export async function createExpense(input: CreateExpenseInput) {
    validateAmount(input.amount);
    const category = validateCategory(input.category);
    const sourceType = input.sourceType || ExpenseSource.manual;

    // Prevent duplicate: same sourceType + sourceId
    if (input.sourceId) {
        const existing = await prisma.expense.findUnique({
            where: {
                sourceType_sourceId: {
                    sourceType: sourceType,
                    sourceId: input.sourceId,
                },
            },
        });
        if (existing) {
            throw new Error('Expense already exists for this source');
        }
    }

    return prisma.expense.create({
        data: {
            userId: input.userId,
            plotId: input.plotId || null,
            shopId: input.shopId || null,
            billId: input.billId || null,
            category,
            sourceType,
            sourceId: input.sourceId || null,
            amount: input.amount,
            description: input.description || null,
            date: input.date,
            receiptUrl: input.receiptUrl || null,
            isRecurring: input.isRecurring || false,
            recurringType: input.recurringType || null,
        },
        include: {
            plot: { select: { name: true } },
            shop: { select: { shopName: true } },
        },
    });
}

// Auto-create expense from other actions (spray, payment, fuel, etc.)
export async function autoCreateExpense(
    tx: any, // Prisma transaction client
    input: {
        userId: string;
        plotId?: string | null;
        shopId?: string | null;
        billId?: string | null;
        category: ExpenseCategory;
        sourceType: ExpenseSource;
        sourceId: string;
        amount: number;
        description: string;
        date: Date;
    }
) {
    validateAmount(input.amount);

    return tx.expense.create({
        data: {
            userId: input.userId,
            plotId: input.plotId || null,
            shopId: input.shopId || null,
            billId: input.billId || null,
            category: input.category,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            amount: input.amount,
            description: input.description,
            date: input.date,
        },
    });
}

// Update expense when source is updated (e.g., spray cost changed)
export async function updateExpenseBySource(
    sourceType: ExpenseSource,
    sourceId: string,
    updates: UpdateExpenseInput
) {
    if (updates.amount !== undefined) {
        validateAmount(updates.amount);
    }

    const existing = await prisma.expense.findUnique({
        where: {
            sourceType_sourceId: {
                sourceType,
                sourceId,
            },
        },
    });

    if (!existing) return null;

    return prisma.expense.update({
        where: { id: existing.id },
        data: {
            ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
            ...(updates.description !== undefined ? { description: updates.description } : {}),
            ...(updates.date !== undefined ? { date: updates.date } : {}),
            ...(updates.category !== undefined ? { category: updates.category } : {}),
            ...(updates.plotId !== undefined ? { plotId: updates.plotId } : {}),
        },
    });
}

// Delete expense when source is deleted (e.g., spray deleted)
export async function deleteExpenseBySource(
    sourceType: ExpenseSource,
    sourceId: string
) {
    const existing = await prisma.expense.findUnique({
        where: {
            sourceType_sourceId: {
                sourceType,
                sourceId,
            },
        },
    });

    if (!existing) return null;

    return prisma.expense.delete({
        where: { id: existing.id },
    });
}

// Get all expenses for a user (with optional filters)
export async function getUserExpenses(
    userId: string,
    filters?: {
        plotId?: string;
        shopId?: string;
        category?: string;
        startDate?: Date;
        endDate?: Date;
    }
) {
    return prisma.expense.findMany({
        where: {
            userId,
            ...(filters?.plotId ? { plotId: filters.plotId } : {}),
            ...(filters?.shopId ? { shopId: filters.shopId } : {}),
            ...(filters?.category ? { category: filters.category as ExpenseCategory } : {}),
            ...(filters?.startDate || filters?.endDate
                ? {
                    date: {
                        ...(filters?.startDate ? { gte: filters.startDate } : {}),
                        ...(filters?.endDate ? { lte: filters.endDate } : {}),
                    },
                }
                : {}),
        },
        orderBy: { date: 'desc' },
        include: {
            plot: { select: { name: true } },
            shop: { select: { shopName: true } },
        },
    });
}

// Get total expenses for a user (overall or per plot)
export async function getExpenseTotal(
    userId: string,
    plotId?: string
) {
    const result = await prisma.expense.aggregate({
        where: {
            userId,
            ...(plotId ? { plotId } : {}),
        },
        _sum: { amount: true },
    });

    return result._sum.amount || 0;
}

// Get expenses grouped by category
export async function getExpensesByCategory(
    userId: string,
    plotId?: string
) {
    const result = await prisma.expense.groupBy({
        by: ['category'],
        where: {
            userId,
            ...(plotId ? { plotId } : {}),
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
    });

    return result;
}