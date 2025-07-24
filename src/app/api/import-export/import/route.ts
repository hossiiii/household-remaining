import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { TransactionService } from '@/lib/transactions';
import { MasterService } from '@/lib/masters';
import { parseCSVFile, parseCSVToTransactions } from '@/lib/csv-utils';
import { prisma } from '@/lib/prisma';
import type { ImportResult } from '@/lib/import-export-client';

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
        error: error instanceof Error ? error.message : 'CSVファイルの読み込みに失敗しました' 
      }, { status: 400 });
    }

    if (csvData.length === 0) {
      return NextResponse.json({ error: 'CSVファイルにデータがありません' }, { status: 400 });
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

    // Prepare results
    const result: ImportResult = {
      imported: 0,
      failed: validationErrors.length,
      errors: validationErrors.map(error => `行 ${error.row}: ${error.message}`)
    };

    // If no valid transactions, return early with validation errors
    if (validTransactions.length === 0) {
      return NextResponse.json(result);
    }

    // Process transactions in batches using Prisma transaction
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < validTransactions.length; i += BATCH_SIZE) {
      batches.push(validTransactions.slice(i, i + BATCH_SIZE));
    }

    let importedCount = 0;
    const importErrors: string[] = [...result.errors];

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const [transactionIndex, transactionData] of batch.entries()) {
            try {
              const dbTransactionData = {
                userId: session.user.id,
                date: transactionData.date,
                dayOfWeek: transactionData.date.toLocaleDateString('ja-JP', { weekday: 'short' }),
                paymentMethodId: transactionData.paymentMethodId,
                store: transactionData.store || null,
                purpose: transactionData.purpose || null,
                type: transactionData.type.toUpperCase() as 'INCOME' | 'EXPENSE',
                amount: transactionData.amount,
              };

              await tx.transaction.create({
                data: dbTransactionData,
              });

              importedCount++;
            } catch (error) {
              const rowNumber = batchIndex * BATCH_SIZE + transactionIndex + 1;
              importErrors.push(`行 ${rowNumber}: 取引の作成に失敗しました`);
              console.error(`Transaction creation error for row ${rowNumber}:`, error);
            }
          }
        });
      } catch (error) {
        // If entire batch fails, mark all transactions in batch as failed
        const batchStart = batchIndex * BATCH_SIZE + 1;
        const batchEnd = Math.min(batchStart + batch.length - 1, validTransactions.length);
        importErrors.push(`行 ${batchStart}-${batchEnd}: バッチ処理に失敗しました`);
        console.error(`Batch ${batchIndex} failed:`, error);
      }
    }

    // Update final results
    result.imported = importedCount;
    result.failed = validationErrors.length + (validTransactions.length - importedCount);
    result.errors = importErrors;

    return NextResponse.json(result);
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'CSVファイルのインポートに失敗しました' }, { status: 500 });
  }
}