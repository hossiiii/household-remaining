'use client';

import React, { useState } from 'react';
import { CSVUploadForm } from './CSVUploadForm';
import { CSVExportForm } from './CSVExportForm';
import type { ImportResult } from '@/lib/import-export-client';

type ActiveTab = 'import' | 'export';

interface ImportExportFormProps {
  onImportSuccess?: (result: ImportResult) => void;
  onImportError?: (error: string) => void;
  onExportSuccess?: () => void;
  onExportError?: (error: string) => void;
}

export const ImportExportForm: React.FC<ImportExportFormProps> = ({
  onImportSuccess,
  onImportError,
  onExportSuccess,
  onExportError,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleImportSuccess = (result: ImportResult) => {
    setErrorMessage('');
    
    let message = `CSVインポートが完了しました。`;
    if (result.imported > 0) {
      message += `${result.imported}件のデータをインポートしました。`;
    }
    if (result.failed > 0) {
      message += `${result.failed}件のデータでエラーが発生しました。`;
    }
    
    setSuccessMessage(message);
    onImportSuccess?.(result);
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleImportError = (error: string) => {
    setSuccessMessage('');
    setErrorMessage(error);
    onImportError?.(error);
    
    // Clear error message after 10 seconds
    setTimeout(() => setErrorMessage(''), 10000);
  };

  const handleExportSuccess = () => {
    setErrorMessage('');
    setSuccessMessage('CSVファイルのダウンロードが開始されました。');
    onExportSuccess?.();
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleExportError = (error: string) => {
    setSuccessMessage('');
    setErrorMessage(error);
    onExportError?.(error);
    
    // Clear error message after 10 seconds
    setTimeout(() => setErrorMessage(''), 10000);
  };

  const tabs = [
    { key: 'import' as const, label: 'CSVインポート', icon: '📥' },
    { key: 'export' as const, label: 'CSVエクスポート', icon: '📤' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'import':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">取引データのインポート</h2>
              <p className="text-sm text-gray-600 mb-6">
                CSVファイルから取引データを一括インポートできます。事前にデータの検証を行うことをお勧めします。
              </p>
            </div>
            
            <div className="bg-white">
              <CSVUploadForm
                onUploadSuccess={handleImportSuccess}
                onUploadError={handleImportError}
              />
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">取引データのエクスポート</h2>
              <p className="text-sm text-gray-600 mb-6">
                登録済みの取引データをCSV形式でエクスポートできます。条件を指定して必要なデータのみを出力することも可能です。
              </p>
            </div>
            
            <div className="bg-white">
              <CSVExportForm
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✓</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-400 hover:text-green-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {errorMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderTabContent()}
      </div>

      {/* Additional Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 ヒント</h3>
        <div className="text-xs text-blue-800 space-y-1">
          <div>• インポート前にデータの検証を行うことで、エラーを事前に確認できます</div>
          <div>• エクスポートしたCSVファイルは、そのままインポートに使用できます</div>
          <div>• 大量のデータを扱う場合は、日付範囲を指定してエクスポートすることをお勧めします</div>
          <div>• 支払い方法名は、マスタデータ管理で登録されている名前と完全に一致する必要があります</div>
        </div>
      </div>
    </div>
  );
};