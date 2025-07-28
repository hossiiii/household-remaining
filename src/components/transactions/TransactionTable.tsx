'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { BalanceCell, BalanceHeaderCell } from './BalanceCell';
import type { TransactionWithPaymentMethod, TransactionWithHistoricalBalance, Bank } from '@/types';
import { TransactionType } from '@prisma/client';
import { formatDate, formatCurrency } from '@/lib/utils';

interface TransactionTableProps {
  transactions: any[];
  onEdit?: (transaction: any) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
  // 履歴残高表示用のオプション
  withHistoricalBalance?: boolean;
  banks?: Bank[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  loading = false,
  withHistoricalBalance = false,
  banks = [],
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        取引データがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              日付
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              曜日
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              支払い方法
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              店舗
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              用途
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              種別
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              金額
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              操作
            </th>
            {/* 履歴残高表示の場合は追加のヘッダー */}
            {withHistoricalBalance && (
              <>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <BalanceHeaderCell type="cash" label="現金" />
                </th>
                {banks.map((bank) => (
                  <th key={bank.id} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <BalanceHeaderCell type="bank" label={bank.name} />
                  </th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {formatDate(new Date(transaction.date))}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {transaction.dayOfWeek}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {(() => {
                  let typeLabel = '';
                  switch (transaction.paymentMethod.type) {
                    case 'CASH':
                      typeLabel = '[現金]';
                      break;
                    case 'CARD':
                      typeLabel = '[カード]';
                      break;
                    case 'BANK':
                      typeLabel = '[銀行]';
                      break;
                  }
                  return `${typeLabel} ${transaction.paymentMethod.name}`;
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {transaction.store || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {transaction.purpose || '-'}
              </td>
              <td className="px-4 py-3 text-sm border-b">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    transaction.type === TransactionType.INCOME
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {transaction.type === TransactionType.INCOME ? '収入' : '支出'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right border-b">
                <span
                  className={
                    transaction.type === TransactionType.INCOME
                      ? 'text-green-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {transaction.type === TransactionType.INCOME ? '+' : '-'}
                  {formatCurrency(Number(transaction.amount))}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-center border-b">
                <div className="flex space-x-2 justify-center">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(transaction)}
                    >
                      編集
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('この取引を削除しますか？')) {
                          onDelete(transaction.id);
                        }
                      }}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </td>
              {/* 履歴残高表示の場合は追加のセル */}
              {withHistoricalBalance && transaction.historicalBalance && (
                <>
                  {/* 現金列 */}
                  <td className="px-2 py-3 text-sm border-b">
                    <BalanceCell
                      transactionAmount={transaction.transactionImpact?.cashAmount}
                      currentBalance={transaction.historicalBalance.cash}
                      isTransactionTarget={transaction.paymentMethod.type === 'CASH'}
                      type="cash"
                    />
                  </td>
                  {/* 銀行列 */}
                  {banks.map((bank) => {
                    const bankBalance = transaction.historicalBalance.banks.find(
                      (b: any) => b.bankId === bank.id
                    );
                    const bankTransaction = transaction.transactionImpact?.bankTransactions?.find(
                      (bt: any) => bt.bankId === bank.id
                    );
                    
                    return (
                      <td key={bank.id} className="px-2 py-3 text-sm border-b">
                        <BalanceCell
                          transactionAmount={bankTransaction?.amount}
                          currentBalance={bankBalance?.balance || 0}
                          isTransactionTarget={
                            transaction.paymentMethod.type === 'BANK' && 
                            transaction.paymentMethod.bankId === bank.id
                          }
                          type="bank"
                          label={bank.name}
                        />
                      </td>
                    );
                  })}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};