import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/register';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '必要なフィールドが入力されていません' },
        { status: 400 }
      );
    }

    const user = await registerUser({ name, email, password });

    return NextResponse.json(
      { message: 'ユーザー登録が完了しました', user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}