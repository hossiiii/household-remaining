import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BalanceService } from '@/lib/balance';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'summary') {
      // 残高サマリーを取得
      const result = await BalanceService.getBalanceSummary(session.user.id);
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data);
    } else {
      // 詳細な残高一覧を取得
      const result = await BalanceService.getBalances(session.user.id);
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json(result.data);
    }
  } catch (error) {
    console.error('Balance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, bankId, amount } = body;

    if (!type || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    if (type === 'BANK' && !bankId) {
      return NextResponse.json({ error: 'bankId is required for bank balance' }, { status: 400 });
    }

    const result = await BalanceService.updateBalance(
      session.user.id,
      type,
      amount,
      bankId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Balance PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'recalculate') {
      // 既存取引データから残高を再計算
      const result = await BalanceService.recalculateBalances(session.user.id);
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ message: '残高を再計算しました' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Balance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}