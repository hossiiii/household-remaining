import React from 'react';

interface BalanceCellProps {
  transactionAmount?: number;  // 変動額（上段）
  currentBalance: number;      // 残高（下段）
  isTransactionTarget: boolean; // この列が取引対象か
  type: 'cash' | 'bank';
  label?: string; // 銀行名など
}

export const BalanceCell: React.FC<BalanceCellProps> = ({
  transactionAmount,
  currentBalance,
  isTransactionTarget,
  type,
  label
}) => {
  // 変動額の表示を決定
  const displayTransactionAmount = isTransactionTarget && transactionAmount !== undefined 
    ? transactionAmount 
    : null;

  // 色分けのクラスを決定
  const getAmountColorClass = (amount: number | null) => {
    if (amount === null || amount === 0) return 'text-gray-500';
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  // 残高の色分け
  const getBalanceColorClass = (balance: number) => {
    if (balance === 0) return 'text-gray-500';
    return balance > 0 ? 'text-blue-600' : 'text-red-500';
  };

  // 金額のフォーマット
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    if (amount === 0) return '-';
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toLocaleString()}`;
  };

  // 残高のフォーマット
  const formatBalance = (balance: number) => {
    return balance.toLocaleString();
  };

  return (
    <div className="balance-cell min-w-[120px] text-center">
      <div className="balance-cell-vertical flex flex-col gap-1">
        {/* 変動額（上段） */}
        <div 
          className={`transaction-amount font-semibold text-sm ${getAmountColorClass(displayTransactionAmount)}`}
          title={displayTransactionAmount !== null ? `${type === 'cash' ? '現金' : label || '銀行'}取引額` : '取引なし'}
        >
          {formatAmount(displayTransactionAmount)}
        </div>
        
        {/* 残高（下段） */}
        <div 
          className={`balance-amount text-xs ${getBalanceColorClass(currentBalance)}`}
          title={`${type === 'cash' ? '現金' : label || '銀行'}残高`}
        >
          残高:{formatBalance(currentBalance)}
        </div>
      </div>
    </div>
  );
};

// 残高データの型定義
export interface BalanceCellData {
  transactionAmount?: number;
  balance: number;
  isTarget: boolean;
}

// ヘッダー用のコンポーネント
interface BalanceHeaderCellProps {
  type: 'cash' | 'bank';
  label: string;
}

export const BalanceHeaderCell: React.FC<BalanceHeaderCellProps> = ({
  type,
  label
}) => {
  const icon = type === 'cash' ? '💰' : '🏦';
  
  return (
    <div className="balance-header-cell min-w-[120px] text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="text-lg">{icon}</div>
        <div className="text-sm font-medium text-gray-700">
          {label}
        </div>
        <div className="text-xs text-gray-500">
          変動額 / 残高
        </div>
      </div>
    </div>
  );
};

export default BalanceCell;