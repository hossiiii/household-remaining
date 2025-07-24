'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ImportExportService } from '@/lib/import-export-client';
import type { ImportResult } from '@/lib/import-export-client';

interface CSVUploadFormProps {
  onUploadSuccess?: (result: ImportResult) => void;
  onUploadError?: (error: string) => void;
  loading?: boolean;
}

export const CSVUploadForm: React.FC<CSVUploadFormProps> = ({
  onUploadSuccess,
  onUploadError,
  loading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      return;
    }

    setIsValidating(true);
    try {
      const result = await ImportExportService.validateCSV(selectedFile);
      
      if (result.success && result.data) {
        setValidationResult(result.data);
      } else {
        setValidationResult({
          valid: false,
          errors: [result.error || '検証に失敗しました']
        });
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: ['検証中にエラーが発生しました']
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await ImportExportService.importCSV(selectedFile);
      
      if (result.success && result.data) {
        onUploadSuccess?.(result.data);
        // Reset form
        setSelectedFile(null);
        setValidationResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        onUploadError?.(result.error || 'インポートに失敗しました');
      }
    } catch (error) {
      onUploadError?.('インポート中にエラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isDisabled = loading || isValidating || isUploading;

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          CSVファイル選択
        </label>
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            disabled={isDisabled}
            className="block w-full text-sm text-gray-500 
              file:mr-4 file:py-2 file:px-4 
              file:rounded-md file:border-0 
              file:text-sm file:font-medium 
              file:bg-blue-50 file:text-blue-700 
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFile}
              disabled={isDisabled}
            >
              クリア
            </Button>
          )}
        </div>
        
        {selectedFile && (
          <div className="text-sm text-gray-600">
            選択ファイル: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Validation Section */}
      {selectedFile && (
        <div className="space-y-2">
          <Button
            variant="secondary"
            onClick={handleValidate}
            loading={isValidating}
            disabled={isDisabled}
            className="w-full"
          >
            {isValidating ? 'データを検証中...' : 'データを検証'}
          </Button>

          {validationResult && (
            <div className={`p-3 rounded-md text-sm ${
              validationResult.valid 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="font-medium mb-1">
                {validationResult.valid ? '✓ データは有効です' : '⚠ データに問題があります'}
              </div>
              {validationResult.errors.length > 0 && (
                <div className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-xs">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Section */}
      {selectedFile && (
        <div className="space-y-2">
          <Button
            onClick={handleUpload}
            loading={isUploading}
            disabled={isDisabled}
            className="w-full"
          >
            {isUploading ? 'インポート中...' : 'CSVをインポート'}
          </Button>
          
          <div className="text-xs text-gray-500 text-center">
            ※ データの検証を行ってからインポートすることをお勧めします
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">CSVフォーマット</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>必要な列: 日付, 支払い方法, 店舗, 用途, 種別, 金額</div>
          <div>• 日付: YYYY-MM-DD形式（例: 2024-01-15）</div>
          <div>• 支払い方法: 登録済みの支払い方法名</div>
          <div>• 種別: income（収入）またはexpense（支出）</div>
          <div>• 金額: 正の数値</div>
          <div>• 店舗・用途: 任意（空欄可）</div>
        </div>
      </div>
    </div>
  );
};