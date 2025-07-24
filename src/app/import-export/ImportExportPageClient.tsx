'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ImportExportForm } from '@/components/import-export/ImportExportForm';
import type { ImportResult } from '@/lib/import-export-client';

export const ImportExportPageClient: React.FC = () => {
  const { data: session } = useSession();
  const [importHistory, setImportHistory] = useState<ImportResult[]>([]);

  const handleImportSuccess = (result: ImportResult) => {
    // Add to import history for display
    setImportHistory(prev => [
      {
        ...result,
        timestamp: new Date(),
      } as ImportResult & { timestamp: Date },
      ...prev.slice(0, 4) // Keep only last 5 imports
    ]);
  };

  const handleImportError = (error: string) => {
    console.error('Import error:', error);
    // Error handling is done in the ImportExportForm component
  };

  const handleExportSuccess = () => {
    console.log('Export successful');
    // Success handling is done in the ImportExportForm component
  };

  const handleExportError = (error: string) => {
    console.error('Export error:', error);
    // Error handling is done in the ImportExportForm component
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">ログインが必要です</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">データのインポート・エクスポート</h1>
        <p className="text-gray-600">
          取引データをCSVファイルでインポート・エクスポートできます。データの一括管理や他システムとの連携にご利用ください。
        </p>
      </div>

      {/* Main Import/Export Form */}
      <div className="mb-8">
        <ImportExportForm
          onImportSuccess={handleImportSuccess}
          onImportError={handleImportError}
          onExportSuccess={handleExportSuccess}
          onExportError={handleExportError}
        />
      </div>

      {/* Recent Import History */}
      {importHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のインポート履歴</h2>
          <div className="space-y-3">
            {importHistory.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.imported > 0 && item.failed === 0
                      ? 'bg-green-100 text-green-800'
                      : item.imported > 0 && item.failed > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.imported > 0 && item.failed === 0
                      ? '完了'
                      : item.imported > 0 && item.failed > 0
                      ? '部分的'
                      : '失敗'
                    }
                  </span>
                  <div className="text-sm text-gray-900">
                    成功: {item.imported}件, 失敗: {item.failed}件
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {(item as ImportResult & { timestamp: Date }).timestamp?.toLocaleString('ja-JP') || ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Guidelines */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-md p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-3">📋 利用上の注意</h3>
        <div className="text-sm text-yellow-800 space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>CSVファイルの文字エンコーディングはUTF-8を使用してください</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>インポート前に必ず支払い方法のマスタデータが登録されていることを確認してください</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>大量のデータをインポートする場合は、ファイルサイズを10MB以下に分けることをお勧めします</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>重複データの確認は自動で行われません。事前にデータの整合性をご確認ください</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>エクスポートしたCSVファイルは、他のシステムでの利用や一括編集後のインポートに使用できます</span>
          </div>
        </div>
      </div>
    </div>
  );
};