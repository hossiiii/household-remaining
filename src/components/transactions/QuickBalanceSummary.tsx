'use client';

import React, { useState, useEffect } from 'react';
import type { BalanceSummary } from '@/types';
import { BalanceService } from '@/lib/balance-client';
import { formatCurrency } from '@/lib/utils';

interface QuickBalanceSummaryProps {
  className?: string;
}

export const QuickBalanceSummary: React.FC<QuickBalanceSummaryProps> = ({ 
  className = '' 
}) => {
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalanceSummary();
  }, []);

  const loadBalanceSummary = async () => {
    setLoading(true);
    try {
      const result = await BalanceService.getBalanceSummary();
      if (result.success && result.data) {
        setBalanceSummary(result.data);
      }
    } catch (error) {
      console.error('Failed to load balance summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">残高を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!balanceSummary) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="text-center py-4 text-gray-500">
          残高情報を読み込めませんでした
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg
              className="w-5 h-5 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
            現在の残高
          </h3>
          <button
            onClick={loadBalanceSummary}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            disabled={loading}
          >
            <svg
              className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            更新
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* 総残高 */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="text-sm font-medium opacity-90">総残高</div>
            <div className="text-2xl font-bold">
              {formatCurrency(balanceSummary.totalBalance)}
            </div>
          </div>
          
          {/* 現金残高 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-800">現金</div>
                <div className="text-xl font-bold text-green-700">
                  {formatCurrency(balanceSummary.cashBalance)}
                </div>
              </div>
              <div className="text-green-600">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* 銀行残高 */}
          {balanceSummary.bankBalances.map((bank) => (
            <div 
              key={bank.bankId}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-blue-800 truncate">
                    {bank.bankName}
                  </div>
                  {bank.branchName && (
                    <div className="text-xs text-blue-600 truncate">
                      {bank.branchName}
                    </div>
                  )}
                  <div className={`text-lg font-bold ${
                    bank.balance >= 0 ? 'text-blue-700' : 'text-red-600'
                  }`}>
                    {formatCurrency(bank.balance)}
                  </div>
                </div>
                <div className="text-blue-600 ml-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
          
          {/* 銀行がない場合の表示 */}
          {balanceSummary.bankBalances.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="text-sm">銀行口座なし</div>
              </div>
            </div>
          )}
        </div>
        
        {/* 更新日時 */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 text-center">
            最終更新: {new Date().toLocaleString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  );
};