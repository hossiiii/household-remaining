import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TransactionService } from '@/lib/transactions';
import { HistoricalBalanceService } from '@/lib/historical-balance';
import { transactionSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || 'all';
    const paymentMethodId = searchParams.get('paymentMethodId') || undefined;
    const store = searchParams.get('store') || undefined;
    const purpose = searchParams.get('purpose') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const withHistoricalBalance = searchParams.get('withHistoricalBalance') === 'true';

    const filter = {
      type: type as 'all' | 'income' | 'expense',
      paymentMethodId,
      store,
      purpose,
      startDate,
      endDate,
    };

    // 履歴残高付きデータが要求された場合
    if (withHistoricalBalance) {
      const result = await HistoricalBalanceService.getTransactionsWithHistoricalBalance(
        session.user.id,
        filter,
        { page, limit }
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }

    // 通常のデータを返す
    const result = await TransactionService.getTransactions(
      session.user.id,
      filter,
      { page, limit }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Transaction GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transactionSchema.parse(body);

    const result = await TransactionService.createTransaction({
      ...validatedData,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}