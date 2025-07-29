import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { paymentMethodSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const initialize = searchParams.get('initialize') === 'true';

    const result = initialize 
      ? await MasterService.getAvailablePaymentMethods(session.user.id)
      : await MasterService.getPaymentMethods(session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Payment methods GET error:', error);
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
    
    // nullをundefinedに変換（Zodバリデーション用）
    const preprocessedData = {
      ...body,
      cardId: body.cardId === null ? undefined : body.cardId,
      bankId: body.bankId === null ? undefined : body.bankId,
    };
    
    const validatedData = paymentMethodSchema.parse(preprocessedData);

    // undefinedをnullに変換してPrismaスキーマとの互換性を保つ
    const data = {
      name: validatedData.name,
      type: validatedData.type,
      cardId: validatedData.cardId || null,
      bankId: validatedData.bankId || null,
      isActive: validatedData.isActive ?? true,
    };

    const result = await MasterService.createPaymentMethod(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Payment method POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}