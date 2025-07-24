import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { cardSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await MasterService.getCards(session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Cards GET error:', error);
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
    const validatedData = cardSchema.parse(body);

    // undefinedをnullに変換してPrismaスキーマとの互換性を保つ
    const data = {
      name: validatedData.name,
      type: validatedData.type,
      withdrawalDay: validatedData.withdrawalDay,
      withdrawalBankId: validatedData.withdrawalBankId,
      isActive: validatedData.isActive ?? true,
    };

    const result = await MasterService.createCard(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Card POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}