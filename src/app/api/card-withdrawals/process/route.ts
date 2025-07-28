import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CardWithdrawalService } from '@/lib/card-withdrawal';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const result = await CardWithdrawalService.processOverdueCardTransactions(session.user.id);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        result,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Card withdrawal processing API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}