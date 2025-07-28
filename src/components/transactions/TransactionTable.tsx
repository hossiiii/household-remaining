'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { BalanceCell } from './BalanceCell';
import type { TransactionWithPaymentMethod, TransactionWithHistoricalBalance } from '@/types';
import { TransactionType } from '@prisma/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { formatDateJapanese } from '@/lib/card-utils';

interface TransactionTableProps {
  transactions: any[];
  onEdit?: (transaction: any) => void;
  onDelete?: (id: string) => void;
  onConvertCard?: (transactionId: string) => void;
  onRevertCard?: (transactionId: string) => void;
  loading?: boolean;
  showHistoricalBalance?: boolean;
  banks?: { id: string; name: string }[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  onConvertCard,
  onRevertCard,
  loading = false,
  showHistoricalBalance = false,
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
            {showHistoricalBalance && (
              <>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  現金
                </th>
                {banks.map((bank) => (
                  <th key={bank.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    {bank.name}
                  </th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <React.Fragment key={transaction.id}>
              <tr className="hover:bg-gray-50">
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
                <div className="flex space-x-1 justify-center flex-wrap">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(transaction)}
                    >
                      編集
                    </Button>
                  )}
                  {/* カード取引の場合の変換/復元ボタン */}
                  {transaction.paymentMethod.type === 'CARD' && (
                    <>
                      {transaction.bankExpense === null && onConvertCard && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onConvertCard(transaction.id)}
                          title="銀行取引に変換"
                        >
                          変換
                        </Button>
                      )}
                      {transaction.bankExpense !== null && onRevertCard && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRevertCard(transaction.id)}
                          title="変換を取り消し"
                        >
                          復元
                        </Button>
                      )}
                    </>
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
              {showHistoricalBalance && (
                <>
                  {/* 現金残高列 */}
                  <BalanceCell
                    transactionAmount={
                      (transaction as TransactionWithHistoricalBalance).transactionImpact?.cashAmount
                    }
                    currentBalance={
                      (transaction as TransactionWithHistoricalBalance).historicalBalance?.cash || 0
                    }
                    isTransactionTarget={
                      (transaction as TransactionWithHistoricalBalance).transactionImpact?.cashAmount !== undefined
                    }
                    type="cash"
                  />
                  {/* 銀行残高列 */}
                  {banks.map((bank) => {
                    const historicalBalance = (transaction as TransactionWithHistoricalBalance).historicalBalance;
                    const bankBalance = historicalBalance?.banks.find(b => b.bankId === bank.id);
                    const bankTransaction = (transaction as TransactionWithHistoricalBalance).transactionImpact?.bankTransactions?.find(t => t.bankId === bank.id);
                    
                    return (
                      <BalanceCell
                        key={bank.id}
                        transactionAmount={bankTransaction?.amount}
                        currentBalance={bankBalance?.balance || 0}
                        isTransactionTarget={bankTransaction !== undefined}
                        type="bank"
                        label={bank.name}
                      />
                    );
                  })}
                </>
              )}
              </tr>
              
              {/* カード取引の場合の引き落とし情報行 */}
              {transaction.paymentMethod.type === 'CARD' && transaction.cardWithdrawalDate && (
                <tr className="bg-blue-50 border-t">
                  <td colSpan={8} className="px-4 py-2 text-xs text-blue-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span>
                          🏦 引き落とし予定: {formatDateJapanese(new Date(transaction.cardWithdrawalDate))}
                        </span>
                        {transaction.bankExpense !== null && (
                          <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            ✅ 変換済み
                          </span>
                        )}
                        {transaction.bankExpense === null && new Date(transaction.cardWithdrawalDate) <= new Date() && (
                          <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            ⚠️ 期限切れ
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};