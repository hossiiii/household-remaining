'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { PaymentMethodWithRelations } from '@/types';

interface PaymentMethodTableProps {
  paymentMethods: PaymentMethodWithRelations[];
  onEdit?: (paymentMethod: PaymentMethodWithRelations) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const PaymentMethodTable: React.FC<PaymentMethodTableProps> = ({
  paymentMethods,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        支払い方法データがありません
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      CASH: '現金',
      CARD: 'カード',
      BANK: '銀行',
    };
    return typeMap[type] || type;
  };

  const getDescription = (paymentMethod: PaymentMethodWithRelations) => {
    if (paymentMethod.type === 'CASH') {
      return '現金支払い';
    } else if (paymentMethod.type === 'CARD' && paymentMethod.card) {
      return `${paymentMethod.card.type === 'CREDIT_CARD' ? 'クレジット' : 'プリペイド'}カード`;
    } else if (paymentMethod.type === 'BANK' && paymentMethod.bank) {
      return `銀行振込 (${paymentMethod.bank.branchName || '本店'})`;
    }
    return '-';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              名前
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              種別
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              説明
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              メモ
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              状態
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paymentMethods.map((paymentMethod) => (
            <tr key={paymentMethod.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {paymentMethod.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {getTypeLabel(paymentMethod.type)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {getDescription(paymentMethod)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {paymentMethod.memo || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-center border-b">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    paymentMethod.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {paymentMethod.isActive ? '有効' : '無効'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-center border-b">
                <div className="flex space-x-2 justify-center">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(paymentMethod)}
                    >
                      編集
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('この支払い方法を削除しますか？')) {
                          onDelete(paymentMethod.id);
                        }
                      }}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};