'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { BalanceSummary } from '@/types';
import { BalanceService } from '@/lib/balance-client';
import { formatCurrency } from '@/lib/utils';

export const BalanceSummaryComponent: React.FC = () => {
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculateLoading, setRecalculateLoading] = useState(false);

  useEffect(() => {
    loadBalanceSummary();
  }, []);

  const loadBalanceSummary = async () => {
    setLoading(true);
    const result = await BalanceService.getBalanceSummary();
    if (result.success && result.data) {
      setBalanceSummary(result.data);
    }
    setLoading(false);
  };

  const handleRecalculate = async () => {
    setRecalculateLoading(true);
    const result = await BalanceService.recalculateBalances();
    if (result.success) {
      await loadBalanceSummary();
      alert('残高を再計算しました');
    } else {
      alert('再計算に失敗しました: ' + result.error);
    }
    setRecalculateLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!balanceSummary) {
    return (
      <div className="text-center py-8 text-gray-500">
        残高情報を読み込めませんでした
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">現在の残高</h2>
        <Button
          onClick={handleRecalculate}
          loading={recalculateLoading}
          variant="secondary"
          size="sm"
        >
          残高を再計算
        </Button>
      </div>

      {/* 総残高カード */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h3 className="text-lg font-medium mb-2">総残高</h3>
        <p className="text-3xl font-bold">
          {formatCurrency(balanceSummary.totalBalance)}
        </p>
      </div>

      {/* 現金残高 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-1">現金</h4>
            <p className="text-gray-600">手持ちの現金</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(balanceSummary.cashBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* 銀行残高 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">銀行残高</h4>
        {balanceSummary.bankBalances.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            銀行残高情報がありません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {balanceSummary.bankBalances.map((bank) => (
              <div
                key={bank.bankId}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">{bank.bankName}</h5>
                    {bank.branchName && (
                      <p className="text-sm text-gray-600">{bank.branchName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${
                      bank.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(bank.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 残高編集への誘導 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              残高は取引データから自動計算されます。手動で調整が必要な場合は、上部の「残高を編集」ボタンから編集してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};