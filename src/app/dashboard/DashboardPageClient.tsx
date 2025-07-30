'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';
import { TransactionService } from '@/lib/transactions-client';
import { formatCurrency, formatDate, getPeriodDates } from '@/lib/utils';

interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export const DashboardPageClient: React.FC = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session?.user?.id, period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodDates(period);
      
      // 統計データの取得
      const result = await TransactionService.getTransactions({
        startDate: start,
        endDate: end,
      }, { page: 1, limit: 1000 }); // 全データを取得して統計計算

      if (result.success && result.data) {
        const transactions = result.data.data;
        
        const totalIncome = transactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpense = transactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        setStats({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: transactions.length,
        });
      }

      // 最近の取引の取得
      const recentResult = await TransactionService.getTransactions({}, { page: 1, limit: 5, sortBy: 'date', sortOrder: 'desc' });
      if (recentResult.success && recentResult.data) {
        setRecentTransactions(recentResult.data.data);
      }
    } catch (error) {
      console.error('Dashboard data load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div>ログインが必要です</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const periodOptions = [
    { value: 'today' as const, label: '今日' },
    { value: 'week' as const, label: '今週' },
    { value: 'month' as const, label: '今月' },
    { value: 'year' as const, label: '今年' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-1">こんにちは、{session.user?.name}さん</p>
        </div>
        <div className="flex space-x-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">↑</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">収入</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">↓</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">支出</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              stats.balance >= 0 ? 'bg-blue-100' : 'bg-yellow-100'
            }`}>
              <span className={`text-xl ${
                stats.balance >= 0 ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                =
              </span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">収支</h3>
              <p className={`text-2xl font-bold ${
                stats.balance >= 0 ? 'text-blue-600' : 'text-yellow-600'
              }`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">#</span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">取引数</h3>
              <p className="text-2xl font-bold text-purple-600">
                {stats.transactionCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 最近の取引 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">最近の取引</h2>
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  すべて見る
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">取引データがありません</p>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.store || '店舗なし'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(new Date(transaction.date))}
                      </p>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.type === 'INCOME'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">クイックアクション</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/transactions">
                <Button className="w-full" variant="primary">
                  新規取引
                </Button>
              </Link>
              <Link href="/masters">
                <Button className="w-full" variant="secondary">
                  マスタ管理
                </Button>
              </Link>
              <Link href="/import-export">
                <Button className="w-full" variant="secondary">
                  CSV出力
                </Button>
              </Link>
              <Link href="/import-export">
                <Button className="w-full" variant="secondary">
                  CSV取込
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};