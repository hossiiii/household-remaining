import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { bankSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await MasterService.getBanks(session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Banks GET error:', error);
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
    const validatedData = bankSchema.parse(body);
    
    // undefinedをnullに変換
    const bankData = {
      name: validatedData.name,
      accountNumber: validatedData.accountNumber ?? null,
      branchName: validatedData.branchName ?? null,
      isActive: validatedData.isActive,
    };

    const result = await MasterService.createBank(
      session.user.id,
      bankData
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Bank POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}