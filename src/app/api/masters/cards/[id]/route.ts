import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { cardSchema } from '@/lib/validations';

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
    const validatedData = cardSchema.partial().parse(body);

    const result = await MasterService.updateCard(
      params.id,
      session.user.id,
      validatedData
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Card PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}