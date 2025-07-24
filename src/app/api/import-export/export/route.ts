import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TransactionService } from '@/lib/transactions';
import { generateTransactionCSV, generateCSVFilename } from '@/lib/csv-utils';
import type { TransactionFilter } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for filtering
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const paymentMethodId = searchParams.get('paymentMethodId') || undefined;
    const type = searchParams.get('type') as 'income' | 'expense' | 'all' || 'all';

    // Validate date parameters
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json({ error: '無効な開始日付です' }, { status: 400 });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: '無効な終了日付です' }, { status: 400 });
    }

    // Build filter object
    const filter: TransactionFilter = {
      type,
      paymentMethodId,
      startDate,
      endDate,
    };

    // Get all transactions (without pagination for export)
    const result = await TransactionService.getTransactions(
      session.user.id,
      filter,
      { page: 1, limit: 10000 } // Large limit to get all matching transactions
    );

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || '取引データの取得に失敗しました' }, { status: 500 });
    }

    const transactions = result.data.data as any[];

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'エクスポートする取引データがありません' }, { status: 404 });
    }

    // Generate CSV content
    const csvContent = generateTransactionCSV(transactions);

    // Generate filename
    const filename = generateCSVFilename('transactions');

    // Return CSV response with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'CSVファイルのエクスポートに失敗しました' }, { status: 500 });
  }
}