'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface BalanceCellProps {
  transactionAmount?: number;  // 変動額（上段）
  currentBalance: number;      // 残高（下段）
  isTransactionTarget: boolean; // この列が取引対象か
  type: 'cash' | 'bank';
  label?: string; // 銀行名など
}

export const BalanceCell: React.FC<BalanceCellProps> = ({
  transactionAmount,
  currentBalance,
  isTransactionTarget,
  type,
  label,
}) => {
  return (
    <td className="px-4 py-3 text-sm text-center border-b min-w-[120px]">
      <div className="flex flex-col gap-1">
        {/* 変動額（上段） */}
        <div className="text-sm font-medium">
          {isTransactionTarget && transactionAmount !== undefined ? (
            <span
              className={`${
                transactionAmount > 0
                  ? 'text-green-600'
                  : transactionAmount < 0
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {transactionAmount > 0 ? '+' : ''}
              {formatCurrency(Math.abs(transactionAmount))}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
        
        {/* 残高（下段） */}
        <div className="text-xs text-gray-600">
          <span className="text-gray-500">残高:</span>
          <span
            className={`font-medium ml-1 ${
              currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(currentBalance)}
          </span>
        </div>
      </div>
    </td>
  );
};