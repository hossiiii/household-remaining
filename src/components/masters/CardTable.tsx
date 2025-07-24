'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { Card, Bank } from '@/types';

interface CardTableProps {
  cards: (Card & { withdrawalBank: Bank })[];
  onEdit?: (card: Card) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const CardTable: React.FC<CardTableProps> = ({
  cards,
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

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        カードデータがありません
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      CREDIT_CARD: 'クレジットカード',
      PREPAID_CARD: 'プリペイドカード',
    };
    return typeMap[type] || type;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              カード名
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              種別
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              引き落とし日
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
              引き落とし銀行
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
          {cards.map((card) => (
            <tr key={card.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {card.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {getTypeLabel(card.type)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {card.withdrawalDay}日
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border-b">
                {card.withdrawalBank.name}
              </td>
              <td className="px-4 py-3 text-sm text-center border-b">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    card.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {card.isActive ? '有効' : '無効'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-center border-b">
                <div className="flex space-x-2 justify-center">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(card)}
                    >
                      編集
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('このカードを削除しますか？')) {
                          onDelete(card.id);
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