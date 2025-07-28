'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { BalanceSummaryComponent } from '@/components/balance/BalanceSummary';
import { BalanceEditForm } from '@/components/balance/BalanceEditForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { 
  TransactionWithPaymentMethod, 
  TransactionWithHistoricalBalance,
  TransactionFormData, 
  TransactionFilter,
  PaginationParams,
  PaymentMethod 
} from '@/types';
import { TransactionService } from '@/lib/transactions-client';
import { MasterService } from '@/lib/masters-client';
import { ImportExportService } from '@/lib/import-export-client';
import { CardWithdrawalClientService } from '@/lib/card-withdrawal-client';
import { formatDate, formatDateForInput, debounce } from '@/lib/utils';

export const TransactionsPageClient: React.FC = () => {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showHistoricalBalance, setShowHistoricalBalance] = useState(false);
  const [showBalanceEditForm, setShowBalanceEditForm] = useState(false);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [cardWithdrawalProcessing, setCardWithdrawalProcessing] = useState(false);
  const [cardWithdrawalMessage, setCardWithdrawalMessage] = useState<string | null>(null);
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
      processOverdueCardTransactions();
      loadTransactions();
      loadPaymentMethods();
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
  }, [showHistoricalBalance, session?.user?.id]);

  const processOverdueCardTransactions = async () => {
    if (!session?.user?.id) return;
    
    setCardWithdrawalProcessing(true);
    setCardWithdrawalMessage(null);
    
    try {
      const result = await CardWithdrawalClientService.processOverdueTransactions();
      
      if (result.success && result.data) {
        const { processedCount, errors } = result.data;
        
        if (processedCount > 0) {
          setCardWithdrawalMessage(`${processedCount}件のカード取引を銀行取引に変換しました`);
          // 残高更新のため再読み込み
          setBalanceRefreshKey(prev => prev + 1);
        }
        
        if (errors.length > 0) {
          console.warn('カード引き落とし処理エラー:', errors);
          setCardWithdrawalMessage(prev => 
            prev ? `${prev}（一部エラーあり）` : `処理中にエラーが発生しました`
          );
        }
      } else if (result.error) {
        console.error('カード引き落とし処理失敗:', result.error);
      }
    } catch (error) {
      console.error('カード引き落とし処理エラー:', error);
    } finally {
      setCardWithdrawalProcessing(false);
      
      // メッセージを5秒後に消去
      if (cardWithdrawalMessage) {
        setTimeout(() => setCardWithdrawalMessage(null), 5000);
      }
    }
  };

  const loadTransactions = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      if (showHistoricalBalance) {
        // 履歴残高付きデータを取得
        const result = await TransactionService.getTransactionsWithHistoricalBalance(
          filter,
          { page: pagination.page, limit: pagination.limit }
        );
        
        if (result.success && result.data) {
          const { transactions: historicalTransactions, banks: historicalBanks } = result.data;
          setTransactions(historicalTransactions);
          setBanks(historicalBanks);
          // Note: Historical balance API doesn't return pagination, so we simulate it
          setPagination(prev => ({
            ...prev,
            total: historicalTransactions.length,
            totalPages: Math.ceil(historicalTransactions.length / pagination.limit),
            hasNext: pagination.page * pagination.limit < historicalTransactions.length,
            hasPrev: pagination.page > 1,
          }));
        }
      } else {
        // 通常の取引データを取得
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
      const result = await ImportExportService.exportCSV({
        ...filter,
        withHistoricalBalance: showHistoricalBalance,
      });

      if (result.success && result.data) {
        // Create and trigger download
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const fileName = showHistoricalBalance 
          ? 'transactions_with_balance.csv' 
          : 'transactions.csv';
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert(result.error || 'CSVエクスポートに失敗しました');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('CSVエクスポートに失敗しました');
    }
  };

  const handleBalanceEditSuccess = () => {
    setShowBalanceEditForm(false);
    setBalanceRefreshKey(prev => prev + 1); // 残高サマリーを再読み込み
  };

  const handleConvertCardTransaction = async (transactionId: string) => {
    if (!session?.user?.id) return;
    
    if (!window.confirm('このカード取引を銀行取引に変換しますか？')) {
      return;
    }
    
    try {
      const result = await CardWithdrawalClientService.convertSingleTransaction(transactionId);
      
      if (result.success) {
        alert('カード取引を銀行取引に変換しました');
        loadTransactions();
        setBalanceRefreshKey(prev => prev + 1);
      } else {
        alert(result.error || 'カード取引の変換に失敗しました');
      }
    } catch (error) {
      console.error('Card conversion error:', error);
      alert('カード取引の変換中にエラーが発生しました');
    }
  };

  const handleRevertCardTransaction = async (transactionId: string) => {
    if (!session?.user?.id) return;
    
    if (!window.confirm('この変換済みカード取引を元に戻しますか？')) {
      return;
    }
    
    try {
      const result = await CardWithdrawalClientService.revertTransaction(transactionId);
      
      if (result.success) {
        alert('カード取引を元に戻しました');
        loadTransactions();
        setBalanceRefreshKey(prev => prev + 1);
      } else {
        alert(result.error || 'カード取引の復元に失敗しました');
      }
    } catch (error) {
      console.error('Card revert error:', error);
      alert('カード取引の復元中にエラーが発生しました');
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
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowBalanceEditForm(true)}
          >
            残高を編集
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportCSV}
          >
            CSVエクスポート
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

      {/* カード引き落とし処理ステータス */}
      {cardWithdrawalProcessing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-700">
            📋 期限切れのカード取引を確認中...
          </div>
        </div>
      )}
      
      {cardWithdrawalMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-700">
            ✅ {cardWithdrawalMessage}
          </div>
        </div>
      )}

      {/* 残高サマリー */}
      <div key={balanceRefreshKey} className="mb-8">
        <BalanceSummaryComponent />
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">検索・フィルター</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="開始日"
            type="date"
            value={filter.startDate ? formatDateForInput(filter.startDate) : ''}
            onChange={(e) => 
              handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <Input
            label="終了日"
            type="date"
            value={filter.endDate ? formatDateForInput(filter.endDate) : ''}
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
        <div className="mt-4 pt-4 border-t">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showHistoricalBalance}
              onChange={(e) => setShowHistoricalBalance(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">履歴残高を表示</span>
          </label>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingTransaction ? '取引編集' : '新規取引'}
          </h2>
          <TransactionForm
            initialData={editingTransaction ? {
              date: formatDateForInput(new Date(editingTransaction.date)),
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
          onConvertCard={handleConvertCardTransaction}
          onRevertCard={handleRevertCardTransaction}
          loading={loading}
          showHistoricalBalance={showHistoricalBalance}
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

      {/* 残高編集モーダル */}
      {showBalanceEditForm && (
        <BalanceEditForm
          onSuccess={handleBalanceEditSuccess}
          onCancel={() => setShowBalanceEditForm(false)}
        />
      )}
    </div>
  );
};