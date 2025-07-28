import Papa from 'papaparse';
import { csvRowSchema } from '@/lib/validations';
import type { TransactionFormData, TransactionWithPaymentMethod, TransactionWithHistoricalBalance, CSVImportData } from '@/types';

// CSVフィールドマッピング: 日本語ヘッダー → 英語フィールド名
const FIELD_MAPPING: Record<string, string> = {
  '日付': 'date',
  '支払い方法': 'paymentMethod',
  '店舗': 'store',
  '用途': 'purpose',
  '種別': 'type',
  '金額': 'amount',
};

// 種別の値マッピング: 日本語 → 英語
const TYPE_MAPPING: Record<string, string> = {
  '収入': 'income',
  '支出': 'expense',
};

/**
 * CSVの行データをフィールドマッピングして英語キーに変換
 */
function mapCSVRowFields(row: any): any {
  const mappedRow: any = {};
  
  // フィールド名を日本語から英語に変換
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = FIELD_MAPPING[key] || key;
    mappedRow[mappedKey] = value;
  }
  
  // 種別の値を日本語から英語に変換
  if (mappedRow.type && TYPE_MAPPING[mappedRow.type]) {
    mappedRow.type = TYPE_MAPPING[mappedRow.type];
  }
  
  return mappedRow;
}

export interface ParsedTransactionData {
  date: Date;
  paymentMethodId: string;
  store?: string;
  purpose?: string;
  type: 'income' | 'expense';
  amount: number;
}

export interface ValidationError {
  row: number;
  message: string;
}

/**
 * CSV データを取引データに変換し、バリデーションを行う
 * 支払い方法名からIDへの解決は呼び出し側で行う
 */
export async function parseCSVToTransactions(
  csvData: any[],
  paymentMethodResolver: (name: string) => Promise<string | null>
): Promise<{
  validTransactions: ParsedTransactionData[];
  errors: ValidationError[];
}> {
  const validTransactions: ParsedTransactionData[] = [];
  const errors: ValidationError[] = [];

  for (const [index, row] of csvData.entries()) {
    try {
      // フィールドマッピングを適用
      const mappedRow = mapCSVRowFields(row);
      
      // Zod でバリデーション
      const validated = csvRowSchema.parse(mappedRow);
      
      // 支払い方法名をIDに解決
      const paymentMethodId = await paymentMethodResolver(validated.paymentMethod);
      if (!paymentMethodId) {
        errors.push({
          row: index + 1,
          message: `支払い方法 "${validated.paymentMethod}" が見つかりません`
        });
        continue;
      }

      // 日付の変換
      const date = new Date(validated.date);
      if (isNaN(date.getTime())) {
        errors.push({
          row: index + 1,
          message: `無効な日付形式: "${validated.date}"`
        });
        continue;
      }

      // 金額の変換
      const amount = parseFloat(validated.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push({
          row: index + 1,
          message: `無効な金額: "${validated.amount}"`
        });
        continue;
      }

      // 種別の変換
      const type = validated.type.toLowerCase();
      if (type !== 'income' && type !== 'expense') {
        errors.push({
          row: index + 1,
          message: `無効な種別: "${validated.type}" (income または expense である必要があります)`
        });
        continue;
      }

      validTransactions.push({
        date,
        paymentMethodId,
        store: validated.store || undefined,
        purpose: validated.purpose || undefined,
        type: type as 'income' | 'expense',
        amount,
      });

    } catch (error) {
      errors.push({
        row: index + 1,
        message: error instanceof Error ? error.message : '不明なエラー'
      });
    }
  }

  return { validTransactions, errors };
}

/**
 * 取引データをCSV形式に変換（UTF-8 BOM付き）
 */
export function generateTransactionCSV(transactions: TransactionWithPaymentMethod[]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  
  const headers = ['日付', '支払い方法', '店舗', '用途', '種別', '金額'];
  
  const csvData = transactions.map(transaction => [
    transaction.date.toISOString().split('T')[0], // YYYY-MM-DD format
    transaction.paymentMethod.name,
    transaction.store || '',
    transaction.purpose || '',
    transaction.type === 'INCOME' ? '収入' : '支出',
    transaction.amount.toString()
  ]);

  // Papa Parse を使ってCSVを生成
  const csvContent = Papa.unparse({
    fields: headers,
    data: csvData
  }, {
    header: true,
    delimiter: ',',
    newline: '\r\n' // Windows compatibility
  });

  return BOM + csvContent;
}

/**
 * 履歴残高付き取引データをCSV形式に変換（UTF-8 BOM付き）
 */
export function generateTransactionCSVWithBalance(
  transactions: TransactionWithHistoricalBalance[],
  banks: { id: string; name: string }[]
): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  
  // 動的なヘッダーを生成
  const baseHeaders = ['日付', '支払方法', '店舗', '用途', '種別', '金額'];
  const balanceHeaders = ['現金取引額', '現金残高'];
  
  // 銀行別のヘッダーを追加
  const bankHeaders = banks.flatMap(bank => [
    `${bank.name}取引額`,
    `${bank.name}残高`
  ]);
  
  const headers = [...baseHeaders, ...balanceHeaders, ...bankHeaders];
  
  // データ行を生成
  const csvData = transactions.map(transaction => {
    const baseData = [
      transaction.date.toISOString().split('T')[0], // YYYY-MM-DD format
      transaction.paymentMethod.name,
      transaction.store || '',
      transaction.purpose || '',
      transaction.type === 'INCOME' ? '収入' : '支出',
      transaction.amount.toString()
    ];
    
    // 現金取引額と残高
    const cashTransactionAmount = transaction.transactionImpact?.cashAmount || '';
    const cashBalance = transaction.historicalBalance?.cash || 0;
    const cashData = [
      cashTransactionAmount === '' ? '' : cashTransactionAmount.toString(),
      cashBalance.toString()
    ];
    
    // 銀行別取引額と残高
    const bankData = banks.flatMap(bank => {
      const bankTransaction = transaction.transactionImpact?.bankTransactions?.find(t => t.bankId === bank.id);
      const bankBalance = transaction.historicalBalance?.banks.find(b => b.bankId === bank.id);
      
      return [
        bankTransaction ? bankTransaction.amount.toString() : '',
        bankBalance ? bankBalance.balance.toString() : '0'
      ];
    });
    
    return [...baseData, ...cashData, ...bankData];
  });

  // Papa Parse を使ってCSVを生成
  const csvContent = Papa.unparse({
    fields: headers,
    data: csvData
  }, {
    header: true,
    delimiter: ',',
    newline: '\r\n' // Windows compatibility
  });

  return BOM + csvContent;
}

/**
 * CSVファイルのダウンロードを実行
 */
export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { 
    type: 'text/csv;charset=utf-8' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * CSVファイルを読み込んでパースする
 */
export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    try {
      // サーバー環境かクライアント環境かを判定
      const isServerEnvironment = typeof window === 'undefined';
      
      if (isServerEnvironment) {
        // サーバー環境: Fileをテキストに変換してからPapa.parseに渡す
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV パース エラー: ${results.errors[0].message}`));
            } else {
              resolve(results.data);
            }
          },
          error: (error: any) => {
            reject(new Error(`CSV 読み込み エラー: ${error.message}`));
          }
        });
      } else {
        // クライアント環境: 従来通りFileオブジェクトを直接使用
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          encoding: 'UTF-8',
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV パース エラー: ${results.errors[0].message}`));
            } else {
              resolve(results.data);
            }
          },
          error: (error: any) => {
            reject(new Error(`CSV 読み込み エラー: ${error.message}`));
          }
        });
      }
    } catch (error) {
      reject(new Error(`ファイル変換エラー: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

/**
 * 現在の日時からCSVファイル名を生成
 */
export function generateCSVFilename(prefix: string = 'transactions'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `${prefix}_${dateStr}_${timeStr}.csv`;
}