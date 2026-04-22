import { NextResponse } from 'next/server';

export async function GET() {
    const checks: Record<string, string> = {};

    // Step 1: Basic
    checks.step1_basic = 'ok';

    // Step 2: Env vars
    try {
        checks.step2_database_url = process.env.DATABASE_URL ? 'exists' : 'MISSING';
        checks.step2_direct_url = process.env.DIRECT_URL ? 'exists' : 'MISSING';
        checks.step2_jwt_secret = process.env.JWT_SECRET ? 'exists' : 'MISSING';
    } catch (e: any) {
        checks.step2_error = e.message;
    }

    // Step 3: Prisma import
    try {
        const { prisma } = await import('@/lib/prisma');
        checks.step3_prisma_import = 'ok';
    } catch (e: any) {
        checks.step3_error = e.message;
    }

    // Step 4: Prisma enums
    try {
        const { WorkerType, WageRateType } = await import('@prisma/client');
        checks.step4_enums = `WorkerType: ${Object.values(WorkerType).join(',')} | WageRateType: ${Object.values(WageRateType).join(',')}`;
    } catch (e: any) {
        checks.step4_error = e.message;
    }

    // Step 5: Auth
    try {
        const { getServerSession } = await import('@/lib/auth');
        const session = await getServerSession();
        checks.step5_auth = session ? `userId: ${session.userId}` : 'no session';
    } catch (e: any) {
        checks.step5_error = e.message;
    }

    // Step 6: DB connection
    try {
        const { prisma } = await import('@/lib/prisma');
        const count = await prisma.worker.count();
        checks.step6_db_query = `workers count: ${count}`;
    } catch (e: any) {
        checks.step6_error = e.message;
    }

    return NextResponse.json(checks);
}