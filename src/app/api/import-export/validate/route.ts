import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MasterService } from '@/lib/masters';
import { parseCSVFile, parseCSVToTransactions } from '@/lib/csv-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data to get uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'CSVファイルが選択されていません' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'CSVファイルを選択してください' }, { status: 400 });
    }

    // Parse CSV file
    let csvData: any[];
    try {
      csvData = await parseCSVFile(file);
    } catch (error) {
      return NextResponse.json({ 
        valid: false, 
        errors: [error instanceof Error ? error.message : 'CSVファイルの読み込みに失敗しました'] 
      });
    }

    if (csvData.length === 0) {
      return NextResponse.json({ 
        valid: false, 
        errors: ['CSVファイルにデータがありません'] 
      });
    }

    // Get user's payment methods for name resolution
    const paymentMethodsResult = await MasterService.getPaymentMethods(session.user.id);
    if (!paymentMethodsResult.success || !paymentMethodsResult.data) {
      return NextResponse.json({ error: '支払い方法の取得に失敗しました' }, { status: 500 });
    }

    const paymentMethods = paymentMethodsResult.data;
    const paymentMethodMap = new Map(paymentMethods.map(pm => [pm.name, pm.id]));

    // Payment method resolver function
    const paymentMethodResolver = async (name: string): Promise<string | null> => {
      return paymentMethodMap.get(name) || null;
    };

    // Parse and validate CSV data
    const { validTransactions, errors: validationErrors } = await parseCSVToTransactions(
      csvData,
      paymentMethodResolver
    );

    const isValid = validationErrors.length === 0;
    const errorMessages = validationErrors.map(error => `行 ${error.row}: ${error.message}`);

    // Add summary information to errors if there are validation issues
    if (!isValid) {
      errorMessages.unshift(`検証結果: ${validTransactions.length}件の有効なデータ, ${validationErrors.length}件のエラー`);
    }

    return NextResponse.json({
      valid: isValid,
      errors: errorMessages,
    });
  } catch (error) {
    console.error('CSV validation error:', error);
    return NextResponse.json({ error: 'CSVファイルの検証に失敗しました' }, { status: 500 });
  }
}