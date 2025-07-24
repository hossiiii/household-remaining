'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ImportExportService } from '@/lib/import-export-client';
import { MasterService } from '@/lib/masters-client';
import { downloadCSVFile, generateCSVFilename } from '@/lib/csv-utils';
import type { ExportFilter } from '@/lib/import-export-client';
import type { PaymentMethod } from '@/types';

interface CSVExportFormProps {
  onExportSuccess?: () => void;
  onExportError?: (error: string) => void;
  loading?: boolean;
}

export const CSVExportForm: React.FC<CSVExportFormProps> = ({
  onExportSuccess,
  onExportError,
  loading = false,
}) => {
  const [exportFilter, setExportFilter] = useState<ExportFilter>({
    type: 'all',
  });
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ExportFilter, string>>>({});

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const result = await MasterService.getPaymentMethods();
    if (result.success && result.data) {
      setPaymentMethods(result.data);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ExportFilter, string>> = {};

    if (exportFilter.startDate && exportFilter.endDate) {
      if (new Date(exportFilter.startDate) > new Date(exportFilter.endDate)) {
        newErrors.endDate = '終了日は開始日以降を選択してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExport = async () => {
    if (!validateForm()) {
      return;
    }

    setIsExporting(true);
    try {
      const result = await ImportExportService.exportCSV(exportFilter);
      
      if (result.success && result.data) {
        // Download the CSV file
        const filename = generateCSVFilename('transactions');
        downloadCSVFile(result.data, filename);
        onExportSuccess?.();
      } else {
        onExportError?.(result.error || 'エクスポートに失敗しました');
      }
    } catch (error) {
      onExportError?.('エクスポート中にエラーが発生しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleInputChange = (field: keyof ExportFilter, value: string | Date | undefined) => {
    setExportFilter(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleClearFilters = () => {
    setExportFilter({
      type: 'all',
    });
    setErrors({});
  };

  const paymentMethodOptions = [
    { value: '', label: 'すべての支払い方法' },
    ...paymentMethods.map(method => ({
      value: method.id,
      label: method.name,
    }))
  ];

  const typeOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'income', label: '収入のみ' },
    { value: 'expense', label: '支出のみ' },
  ];

  const isDisabled = loading || isExporting;

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">エクスポート条件</h3>
        
        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="開始日"
            type="date"
            value={exportFilter.startDate ? exportFilter.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
            error={errors.startDate}
            disabled={isDisabled}
          />

          <Input
            label="終了日"
            type="date"
            value={exportFilter.endDate ? exportFilter.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
            error={errors.endDate}
            disabled={isDisabled}
          />
        </div>

        {/* Payment Method and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="支払い方法"
            options={paymentMethodOptions}
            value={exportFilter.paymentMethodId || ''}
            onChange={(e) => handleInputChange('paymentMethodId', e.target.value || undefined)}
            disabled={isDisabled}
          />

          <Select
            label="取引種別"
            options={typeOptions}
            value={exportFilter.type || 'all'}
            onChange={(e) => handleInputChange('type', e.target.value as 'income' | 'expense' | 'all')}
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleExport}
          loading={isExporting}
          disabled={isDisabled}
          className="flex-1"
        >
          {isExporting ? 'エクスポート中...' : 'CSVエクスポート'}
        </Button>
        
        <Button
          variant="secondary"
          onClick={handleClearFilters}
          disabled={isDisabled}
          className="flex-1"
        >
          フィルタクリア
        </Button>
      </div>

      {/* Current Filter Summary */}
      {(exportFilter.startDate || exportFilter.endDate || exportFilter.paymentMethodId || exportFilter.type !== 'all') && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">設定中のフィルタ</h4>
          <div className="text-xs text-blue-800 space-y-1">
            {exportFilter.startDate && (
              <div>開始日: {exportFilter.startDate.toLocaleDateString('ja-JP')}</div>
            )}
            {exportFilter.endDate && (
              <div>終了日: {exportFilter.endDate.toLocaleDateString('ja-JP')}</div>
            )}
            {exportFilter.paymentMethodId && (
              <div>支払い方法: {paymentMethods.find(pm => pm.id === exportFilter.paymentMethodId)?.name}</div>
            )}
            {exportFilter.type !== 'all' && (
              <div>種別: {exportFilter.type === 'income' ? '収入' : '支出'}</div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">エクスポートについて</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• 設定した条件に一致する取引データをCSV形式でダウンロードします</div>
          <div>• CSVファイルはExcelで開くことができます</div>
          <div>• フィルタを設定しない場合、すべての取引データがエクスポートされます</div>
          <div>• 大量のデータをエクスポートする場合は時間がかかることがあります</div>
        </div>
      </div>
    </div>
  );
};