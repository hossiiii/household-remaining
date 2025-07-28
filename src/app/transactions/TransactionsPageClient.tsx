'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { 
  TransactionWithPaymentMethod, 
  TransactionWithHistoricalBalance,
  TransactionFormData, 
  TransactionFilter,
  PaginationParams,
  PaymentMethod,
  Bank
} from '@/types';
import { TransactionService } from '@/lib/transactions-client';
import { MasterService } from '@/lib/masters-client';
import { ImportExportService } from '@/lib/import-export-client';
import { formatDate, debounce } from '@/lib/utils';

export const TransactionsPageClient: React.FC = () => {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [withHistoricalBalance, setWithHistoricalBalance] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [filter, setFilter] = useState<TransactionFilter>({
    type: 'all',
  });

  const debouncedSearch = debounce(() => {
    loadTransactions();
  }, 500);

  useEffect(() => {
    if (session?.user?.id) {
      loadTransactions();
      loadPaymentMethods();
      loadBanks();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      debouncedSearch();
    }
  }, [filter, session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      loadTransactions();
    }
  }, [withHistoricalBalance, session?.user?.id]);

  const loadTransactions = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      if (withHistoricalBalance) {
        // 履歴残高付きデータを取得
        const result = await TransactionService.getTransactionsWithBalance(
          filter,
          { page: pagination.page, limit: pagination.limit }
        );
        
        if (result.success && result.data) {
          setTransactions(result.data.transactions);
          setBanks(result.data.banks);
          setPagination(result.data.pagination);
        }
      } else {
        // 通常のデータを取得
        const result = await TransactionService.getTransactions(
          filter,
          { page: pagination.page, limit: pagination.limit }
        );
        
        if (result.success && result.data) {
          setTransactions(result.data.data);
          setPagination(result.data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    if (!session?.user?.id) return;
    
    const result = await MasterService.getPaymentMethods();
    if (result.success && result.data) {
      setPaymentMethods(result.data);
    }
  };

  const loadBanks = async () => {
    if (!session?.user?.id) return;
    
    const result = await MasterService.getBanks();
    if (result.success && result.data) {
      setBanks(result.data);
    }
  };

  const handleCreateTransaction = async (data: TransactionFormData) => {
    if (!session?.user?.id) return;
    
    const result = await TransactionService.createTransaction(data);
    
    if (result.success) {
      setShowForm(false);
      loadTransactions();
    } else {
      alert(result.error || '取引の作成に失敗しました');
    }
  };

  const handleUpdateTransaction = async (data: TransactionFormData) => {
    if (!editingTransaction || !session?.user?.id) return;
    
    const result = await TransactionService.updateTransaction(
      editingTransaction.id,
      data
    );
    
    if (result.success) {
      setEditingTransaction(null);
      setShowForm(false);
      loadTransactions();
    } else {
      alert(result.error || '取引の更新に失敗しました');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user?.id) return;
    
    const result = await TransactionService.deleteTransaction(id);
    if (result.success) {
      loadTransactions();
    } else {
      alert(result.error || '取引の削除に失敗しました');
    }
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleFilterChange = (key: keyof TransactionFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadTransactions();
  };

  const handleExportCSV = async () => {
    if (!session?.user?.id) return;
    
    try {
      const result = withHistoricalBalance 
        ? await ImportExportService.exportCSVWithBalance(filter)
        : await ImportExportService.exportCSV(filter);
      
      if (result.success && result.data) {
        // CSV ファイルのダウンロードを実行
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = withHistoricalBalance 
          ? `transactions_with_balance_${new Date().toISOString().split('T')[0]}.csv`
          : `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert(result.error || 'CSV エクスポートに失敗しました');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('CSV エクスポートに失敗しました');
    }
  };

  if (!session) {
    return <div>ログインが必要です</div>;
  }

  const paymentMethodOptions = [
    { value: '', label: 'すべて' },
    ...paymentMethods.map(method => ({
      value: method.id,
      label: method.name,
    })),
  ];

  const typeOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'income', label: '収入' },
    { value: 'expense', label: '支出' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">取引管理</h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
          >
            CSV エクスポート
          </Button>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(true);
            }}
          >
            新規取引
          </Button>
        </div>
      </div>
      
      {/* 表示モード切り替え */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">表示設定</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={withHistoricalBalance}
              onChange={(e) => setWithHistoricalBalance(e.target.checked)}
              className="mr-2"
            />
            履歴残高を表示する
          </label>
          <span className="text-sm text-gray-500">
            {withHistoricalBalance ? '各取引時点での現金・銀行残高を表示' : '通常の取引一覧を表示'}
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">検索・フィルター</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="開始日"
            type="date"
            value={filter.startDate ? formatDate(filter.startDate) : ''}
            onChange={(e) => 
              handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <Input
            label="終了日"
            type="date"
            value={filter.endDate ? formatDate(filter.endDate) : ''}
            onChange={(e) => 
              handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <Select
            label="支払い方法"
            options={paymentMethodOptions}
            value={filter.paymentMethodId || ''}
            onChange={(e) => handleFilterChange('paymentMethodId', e.target.value || undefined)}
          />
          <Select
            label="種別"
            options={typeOptions}
            value={filter.type || 'all'}
            onChange={(e) => handleFilterChange('type', e.target.value)}
          />
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingTransaction ? '取引編集' : '新規取引'}
          </h2>
          <TransactionForm
            initialData={editingTransaction ? {
              date: formatDate(new Date(editingTransaction.date)),
              paymentMethodId: editingTransaction.paymentMethodId,
              store: editingTransaction.store || undefined,
              purpose: editingTransaction.purpose || undefined,
              type: editingTransaction.type.toLowerCase() as 'income' | 'expense',
              amount: Number(editingTransaction.amount),
            } : undefined}
            onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <TransactionTable
          transactions={transactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          loading={loading}
          withHistoricalBalance={withHistoricalBalance}
          banks={banks}
        />

        {pagination.totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t">
            <div className="text-sm text-gray-700">
              {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}件を表示
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                前へ
              </Button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                次へ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};