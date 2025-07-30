'use client';

import React, { useState } from 'react';
import type { BankWithdrawalScheduleData } from '@/lib/bank-withdrawal-schedule-client';

interface BankWithdrawalScheduleTableProps {
  data: BankWithdrawalScheduleData;
  loading?: boolean;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  bankName: string;
  transactions: {
    id: string;
    store: string;
    purpose: string;
    amount: number;
    cardName?: string;
  }[];
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, date, bankName, transactions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {date} - {bankName} 引き落とし詳細
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {transaction.cardName ? `${transaction.cardName}` : transaction.purpose}
                  </div>
                  {transaction.store && (
                    <div className="text-sm text-gray-600">{transaction.store}</div>
                  )}
                  <div className="text-sm text-gray-500">{transaction.purpose}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ¥{transaction.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="border-t pt-2 mt-4">
            <div className="flex justify-between items-center font-bold">
              <span>合計:</span>
              <span>¥{transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BankWithdrawalScheduleTable: React.FC<BankWithdrawalScheduleTableProps> = ({
  data,
  loading = false,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<{
    date: string;
    bankName: string;
    transactions: any[];
  } | null>(null);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!data.schedule.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        指定期間に引き落とし予定がありません
      </div>
    );
  }

  // 月別にグループ化
  const monthlyGroups = data.schedule.reduce((groups, item) => {
    const monthKey = `${item.year}-${String(item.month).padStart(2, '0')}`;
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(item);
    return groups;
  }, {} as Record<string, typeof data.schedule>);

  const handleCellClick = (date: string, withdrawal: any) => {
    if (withdrawal.transactions.length > 0) {
      setSelectedDetail({
        date,
        bankName: withdrawal.bankName,
        transactions: withdrawal.transactions,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        {Object.entries(monthlyGroups).map(([monthKey, scheduleItems]) => (
          <div key={monthKey} className="mb-8">
            <h3 className="text-lg font-medium mb-4">
              {monthKey.replace('-', '年')}月
            </h3>
            
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left min-w-[120px]">
                    日付
                  </th>
                  {data.banks.map((bank) => (
                    <th key={bank.id} className="border border-gray-300 px-4 py-2 text-center min-w-[120px]">
                      {bank.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((scheduleItem) => {
                  const dateObj = new Date(scheduleItem.date);
                  const formattedDate = `${scheduleItem.month}/${dateObj.getDate()}`;
                  const dayOfWeek = dateObj.toLocaleDateString('ja-JP', { weekday: 'short' });
                  
                  return (
                    <tr key={scheduleItem.date} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="text-sm">
                          <div>{formattedDate}</div>
                          <div className="text-gray-500">({dayOfWeek})</div>
                        </div>
                      </td>
                      {data.banks.map((bank) => {
                        const withdrawal = scheduleItem.withdrawals.find(w => w.bankId === bank.id);
                        
                        return (
                          <td 
                            key={bank.id} 
                            className={`border border-gray-300 px-4 py-2 text-center ${
                              withdrawal && withdrawal.amount > 0 
                                ? 'cursor-pointer hover:bg-blue-50' 
                                : ''
                            }`}
                            onClick={() => withdrawal && handleCellClick(scheduleItem.date, withdrawal)}
                          >
                            {withdrawal && withdrawal.amount > 0 ? (
                              <div className="text-red-600 font-medium">
                                ¥{withdrawal.amount.toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-gray-300">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* 凡例 */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-medium mb-2">使い方</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 赤字の金額をクリックすると、詳細な引き落とし内容が表示されます</li>
          <li>• 金額は各銀行からの引き落とし予定額の合計です</li>
          <li>• データは自動生成された引き落とし取引を基に表示されます</li>
        </ul>
      </div>

      {/* 詳細モーダル */}
      <DetailModal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        date={selectedDetail?.date || ''}
        bankName={selectedDetail?.bankName || ''}
        transactions={selectedDetail?.transactions || []}
      />
    </div>
  );
};