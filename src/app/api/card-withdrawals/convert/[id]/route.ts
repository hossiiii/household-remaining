import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CardWithdrawalService } from '@/lib/card-withdrawal';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const result = await CardWithdrawalService.convertSingleCardTransaction(
      params.id,
      session.user.id
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Card transaction conversion API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}