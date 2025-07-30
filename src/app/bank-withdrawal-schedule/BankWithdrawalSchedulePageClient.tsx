'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import type { BankWithdrawalScheduleResponse, BankWithdrawalScheduleItem } from '../api/bank-withdrawal-schedule/route';

interface WithdrawalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BankWithdrawalScheduleItem | null;
}

const WithdrawalDetailModal: React.FC<WithdrawalDetailModalProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">引落し詳細</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">日付: {item.date}</p>
          <p className="text-sm text-gray-600">銀行: {item.bankName}</p>
          <p className="text-lg font-semibold">合計: ¥{item.totalAmount.toLocaleString()}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">取引詳細:</h4>
          {item.transactions.map((transaction) => (
            <div key={transaction.id} className="border rounded p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{transaction.cardName}</p>
                  <p className="text-sm text-gray-600">{transaction.purpose}</p>
                </div>
                <p className="font-semibold">¥{transaction.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
};

export const BankWithdrawalSchedulePageClient: React.FC = () => {
  const [data, setData] = useState<BankWithdrawalScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BankWithdrawalScheduleItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bank-withdrawal-schedule');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      setError('データの取得中にエラーが発生しました');
      console.error('Error fetching bank withdrawal schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCellClick = (item: BankWithdrawalScheduleItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">エラー: {error}</div>
      </div>
    );
  }

  if (!data || data.schedule.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
        <div className="text-gray-600">引落し予定データがありません。</div>
        <p className="text-sm text-gray-500 mt-2">
          カードの引落し処理を実行すると、ここに引落し予定が表示されます。
        </p>
      </div>
    );
  }

  // データを整理してテーブル形式にする
  const bankNames = [...new Set(data.schedule.map(item => item.bankName))].sort();
  const dates = [...new Set(data.schedule.map(item => item.date))].sort();
  
  // 日付を月でグループ化
  const datesByMonth = dates.reduce((acc, date) => {
    const yearMonth = date.slice(0, 7); // YYYY-MM
    if (!acc[yearMonth]) {
      acc[yearMonth] = [];
    }
    acc[yearMonth].push(date);
    return acc;
  }, {} as Record<string, string[]>);

  // データ検索用のマップを作成
  const dataMap = new Map<string, BankWithdrawalScheduleItem>();
  data.schedule.forEach(item => {
    const key = `${item.date}_${item.bankName}`;
    dataMap.set(key, item);
  });

  return (
    <div className="space-y-6">
      {/* 銀行別月次合計サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">銀行別月次合計</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-900">銀行名</th>
                {Object.keys(datesByMonth).sort().map(yearMonth => (
                  <th key={yearMonth} className="px-4 py-2 text-right font-medium text-gray-900">
                    {yearMonth}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium text-gray-900 bg-blue-50">合計</th>
              </tr>
            </thead>
            <tbody>
              {data.bankSummaries.map((summary) => (
                <tr key={summary.bankId} className="border-t">
                  <td className="px-4 py-2 font-medium">{summary.bankName}</td>
                  {Object.keys(datesByMonth).sort().map(yearMonth => (
                    <td key={yearMonth} className="px-4 py-2 text-right">
                      {summary.monthlyTotals[yearMonth] ? 
                        `¥${summary.monthlyTotals[yearMonth].toLocaleString()}` : 
                        '-'
                      }
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-semibold bg-blue-50">
                    ¥{summary.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 引落し予定詳細テーブル */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">引落し予定詳細</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-900">日付</th>
                {bankNames.map(bankName => (
                  <th key={bankName} className="px-4 py-2 text-center font-medium text-gray-900">
                    {bankName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(datesByMonth).sort().map(([yearMonth, monthDates]) => (
                <React.Fragment key={yearMonth}>
                  {/* 月のヘッダー行 */}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={bankNames.length + 1} className="px-4 py-2 font-semibold text-blue-900">
                      {yearMonth} ({new Date(yearMonth + '-01').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })})
                    </td>
                  </tr>
                  {monthDates.sort().map(date => (
                    <tr key={date} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">
                        {new Date(date).toLocaleDateString('ja-JP', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short' 
                        })}
                      </td>
                      {bankNames.map(bankName => {
                        const item = dataMap.get(`${date}_${bankName}`);
                        return (
                          <td key={bankName} className="px-4 py-2 text-center">
                            {item ? (
                              <button
                                onClick={() => handleCellClick(item)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                ¥{item.totalAmount.toLocaleString()}
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <WithdrawalDetailModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
      />
    </div>
  );
};