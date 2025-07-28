import type { APIResponse } from '@/types';

export interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export interface ExportFilter {
  startDate?: Date;
  endDate?: Date;
  paymentMethodId?: string;
  type?: 'income' | 'expense' | 'all';
}

export class ImportExportService {
  static async importCSV(file: File): Promise<APIResponse<ImportResult>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-export/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'CSVファイルのインポートに失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'CSVファイルのインポートに失敗しました' };
    }
  }

  static async exportCSV(filter: ExportFilter = {}): Promise<APIResponse<string>> {
    try {
      const params = new URLSearchParams();
      
      if (filter.startDate) {
        params.append('startDate', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        params.append('endDate', filter.endDate.toISOString());
      }
      if (filter.paymentMethodId) {
        params.append('paymentMethodId', filter.paymentMethodId);
      }
      if (filter.type && filter.type !== 'all') {
        params.append('type', filter.type);
      }

      const response = await fetch(`/api/import-export/export?${params}`);
      
      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'CSVファイルのエクスポートに失敗しました' };
      }

      const csvContent = await response.text();
      return { success: true, data: csvContent };
    } catch (error) {
      return { success: false, error: 'CSVファイルのエクスポートに失敗しました' };
    }
  }

  static async validateCSV(file: File): Promise<APIResponse<{ valid: boolean; errors: string[] }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-export/validate', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'CSVファイルの検証に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'CSVファイルの検証に失敗しました' };
    }
  }

  // 履歴残高付きCSVエクスポート
  static async exportCSVWithBalance(filter: ExportFilter = {}): Promise<APIResponse<string>> {
    try {
      const params = new URLSearchParams();
      
      // 履歴残高付きエクスポートを指定
      params.append('withHistoricalBalance', 'true');
      
      if (filter.startDate) {
        params.append('startDate', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        params.append('endDate', filter.endDate.toISOString());
      }
      if (filter.paymentMethodId) {
        params.append('paymentMethodId', filter.paymentMethodId);
      }
      if (filter.type && filter.type !== 'all') {
        params.append('type', filter.type);
      }

      const response = await fetch(`/api/import-export/export?${params}`);
      
      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || '履歴残高付きCSVファイルのエクスポートに失敗しました' };
      }

      const csvContent = await response.text();
      return { success: true, data: csvContent };
    } catch (error) {
      return { success: false, error: '履歴残高付きCSVファイルのエクスポートに失敗しました' };
    }
  }
}