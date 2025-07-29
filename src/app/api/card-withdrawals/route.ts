import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CardWithdrawalService } from '@/lib/card-withdrawal';

/**
 * カード引き落とし処理API
 * POST: カードの自動引き落とし処理を実行
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await CardWithdrawalService.processCardWithdrawals(session.user.id);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Card withdrawal API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}