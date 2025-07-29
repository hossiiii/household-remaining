import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { paymentMethodUpdateSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const validatedData = paymentMethodUpdateSchema.parse(preprocessedData);

    // undefinedをnullに変換してPrismaスキーマとの互換性を保つ
    const data = {
      ...validatedData,
      cardId: validatedData.cardId || null,
      bankId: validatedData.bankId || null,
      memo: validatedData.memo || null,
    };

    const result = await MasterService.updatePaymentMethod(
      params.id,
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Payment method PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}