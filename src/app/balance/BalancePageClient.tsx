'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BalanceSummaryComponent } from '@/components/balance/BalanceSummary';
import { BalanceEditForm } from '@/components/balance/BalanceEditForm';

export const BalancePageClient: React.FC = () => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setRefreshKey(prev => prev + 1); // 残高サマリーを再読み込み
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">残高管理</h1>
              <p className="mt-2 text-gray-600">
                現金・銀行の残高を確認・管理できます
              </p>
            </div>
            <Button
              onClick={() => setShowEditForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              残高を編集
            </Button>
          </div>
        </div>

        {/* 残高サマリー */}
        <div key={refreshKey}>
          <BalanceSummaryComponent />
        </div>
      </div>

      {/* 編集モーダル */}
      {showEditForm && (
        <BalanceEditForm
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
};