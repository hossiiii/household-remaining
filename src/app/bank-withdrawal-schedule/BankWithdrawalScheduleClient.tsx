'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Transaction {
  id: string;
  date: string;
  purpose: string;
  amount: number;
  store: string;
  paymentMethod: {
    bank: {
      name: string;
    };
  };
}

interface WithdrawalScheduleData {
  scheduleData: { [date: string]: { [bankName: string]: { totalAmount: number; transactions: Transaction[] } } };
  monthlyTotals: { [yearMonth: string]: { [bankName: string]: number } };
  bankNames: string[];
  dates: string[];
  summary: {
    totalBanks: number;
    totalDates: number;
    totalTransactions: number;
  };
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  bankName: string;
  transactions: Transaction[];
}

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, date, bankName, transactions }) => {
  if (!isOpen) return null;

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {date} - {bankName} 引落し詳細
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm font-medium text-blue-900">
            合計金額: ¥{totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="border rounded p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{transaction.purpose}</p>
                  <p className="text-sm text-gray-600">{transaction.store}</p>
                </div>
                <p className="font-semibold text-right">
                  ¥{Number(transaction.amount).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BankWithdrawalScheduleClient: React.FC = () => {
  const [data, setData] = useState<WithdrawalScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{
    date: string;
    bankName: string;
    transactions: Transaction[];
  } | null>(null);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
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
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (date: string, bankName: string, transactions: Transaction[]) => {
    setSelectedDetail({ date, bankName, transactions });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getYearMonth = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={fetchScheduleData}>再試行</Button>
      </div>
    );
  }

  if (!data || data.bankNames.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">引落し予定データがありません</div>
      </div>
    );
  }

  // 月別にデータをグループ化
  const monthlyGroups: { [yearMonth: string]: string[] } = {};
  data.dates.forEach(date => {
    const yearMonth = getYearMonth(date);
    if (!monthlyGroups[yearMonth]) {
      monthlyGroups[yearMonth] = [];
    }
    monthlyGroups[yearMonth].push(date);
  });

  const sortedMonths = Object.keys(monthlyGroups).sort();

  return (
    <div className="space-y-8">
      {/* 概要 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">概要</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.summary.totalBanks}</div>
            <div className="text-sm text-gray-600">銀行数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.summary.totalDates}</div>
            <div className="text-sm text-gray-600">引落し予定日数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{data.summary.totalTransactions}</div>
            <div className="text-sm text-gray-600">引落し取引数</div>
          </div>
        </div>
      </div>

      {/* 月別銀行別合計テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">月別銀行別合計</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  年月
                </th>
                {data.bankNames.map(bankName => (
                  <th key={bankName} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {bankName}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  月計
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMonths.map(yearMonth => {
                const monthTotal = data.bankNames.reduce((total, bankName) => {
                  return total + (data.monthlyTotals[yearMonth]?.[bankName] || 0);
                }, 0);

                return (
                  <tr key={yearMonth}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {yearMonth}
                    </td>
                    {data.bankNames.map(bankName => {
                      const amount = data.monthlyTotals[yearMonth]?.[bankName] || 0;
                      return (
                        <td key={bankName} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {amount > 0 ? (
                            <span className="font-medium text-red-600">
                              ¥{amount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-red-700">
                      ¥{monthTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 日別引落し予定詳細テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">日別引落し予定詳細</h2>
          <p className="text-sm text-gray-600 mt-1">セルをクリックすると詳細が表示されます</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  引落し日
                </th>
                {data.bankNames.map(bankName => (
                  <th key={bankName} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {bankName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.dates.map(date => (
                <tr key={date}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(date)}
                    <div className="text-xs text-gray-500">{date}</div>
                  </td>
                  {data.bankNames.map(bankName => {
                    const cellData = data.scheduleData[date]?.[bankName];
                    return (
                      <td key={bankName} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {cellData ? (
                          <button
                            onClick={() => handleCellClick(date, bankName, cellData.transactions)}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            ¥{cellData.totalAmount.toLocaleString()}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedDetail && (
        <DetailModal
          isOpen={true}
          onClose={() => setSelectedDetail(null)}
          date={selectedDetail.date}
          bankName={selectedDetail.bankName}
          transactions={selectedDetail.transactions}
        />
      )}
    </div>
  );
};