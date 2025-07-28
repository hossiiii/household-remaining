import { prisma } from './prisma';
import { BalanceService } from './balance';
import type {
  Transaction,
  TransactionWithPaymentMethod,
  Bank,
  APIResponse,
  TransactionFilter,
  PaginationParams
} from '@/types';

// 履歴残高データ
export interface HistoricalBalance {
  cash: number;
  banks: { bankId: string; bankName: string; balance: number }[];
}

// 履歴残高付き取引
export type TransactionWithHistoricalBalance = TransactionWithPaymentMethod & {
  historicalBalance: HistoricalBalance;
  transactionImpact: {
    cashAmount?: number;
    bankTransactions?: { bankId: string; amount: number }[];
  };
};

// CSV用拡張データ
export interface CSVRowWithBalance {
  date: string;
  paymentMethod: string;
  store: string;
  purpose: string;
  type: string;
  amount: number;
  cashTransaction: number | '';
  cashBalance: number;
  [key: string]: number | string; // 動的な銀行列
}

/**
 * 履歴残高計算サービス
 * 現在残高から逆算して任意の時点での残高を算出
 */
export class HistoricalBalanceService {
  /**
   * 指定日時点での残高を計算
   */
  static async calculateHistoricalBalance(
    userId: string, 
    targetDate: Date
  ): Promise<APIResponse<HistoricalBalance>> {
    try {
      // 現在残高を取得
      const currentBalanceResponse = await BalanceService.getBalanceSummary(userId);
      if (!currentBalanceResponse.success || !currentBalanceResponse.data) {
        return { success: false, error: '現在残高の取得に失敗しました' };
      }

      const currentSummary = currentBalanceResponse.data;

      // 指定日以降の取引を取得
      const transactionsAfterDate = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gt: targetDate },
        },
        include: {
          paymentMethod: {
            include: { bank: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      // 現金残高の計算
      const cashTransactionsAfter = transactionsAfterDate.filter(
        t => t.paymentMethod.type === 'CASH'
      );
      const cashChangeAfterTarget = cashTransactionsAfter.reduce(
        (sum, t) => sum + (t.type === 'INCOME' ? t.amount.toNumber() : -t.amount.toNumber()),
        0
      );
      const historicalCashBalance = currentSummary.cashBalance - cashChangeAfterTarget;

      // 銀行残高の計算
      const historicalBankBalances: { bankId: string; bankName: string; balance: number }[] = [];
      
      for (const currentBankBalance of currentSummary.bankBalances) {
        const bankTransactionsAfter = transactionsAfterDate.filter(
          t => t.paymentMethod.type === 'BANK' && t.paymentMethod.bankId === currentBankBalance.bankId
        );
        const bankChangeAfterTarget = bankTransactionsAfter.reduce(
          (sum, t) => sum + (t.type === 'INCOME' ? t.amount.toNumber() : -t.amount.toNumber()),
          0
        );
        const historicalBankBalance = currentBankBalance.balance - bankChangeAfterTarget;

        historicalBankBalances.push({
          bankId: currentBankBalance.bankId,
          bankName: currentBankBalance.bankName,
          balance: historicalBankBalance,
        });
      }

      const historicalBalance: HistoricalBalance = {
        cash: historicalCashBalance,
        banks: historicalBankBalances,
      };

      return { success: true, data: historicalBalance };
    } catch (error) {
      console.error('履歴残高計算エラー:', error);
      return { success: false, error: '履歴残高の計算に失敗しました' };
    }
  }

  /**
   * 取引一覧に履歴残高を付与
   */
  static async getTransactionsWithHistoricalBalance(
    userId: string,
    filter: TransactionFilter = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<APIResponse<{ 
    transactions: TransactionWithHistoricalBalance[];
    banks: Bank[];
    pagination: any;
  }>> {
    try {
      // 通常の取引データを取得
      const where: any = { userId };

      // フィルター条件を構築
      if (filter.startDate) where.date = { gte: filter.startDate };
      if (filter.endDate) where.date = { ...where.date, lte: filter.endDate };
      if (filter.paymentMethodId) where.paymentMethodId = filter.paymentMethodId;
      if (filter.type && filter.type !== 'all') where.type = filter.type.toUpperCase();
      if (filter.store) where.store = { contains: filter.store, mode: 'insensitive' };
      if (filter.purpose) where.purpose = { contains: filter.purpose, mode: 'insensitive' };

      const total = await prisma.transaction.count({ where });

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          paymentMethod: {
            include: {
              bank: true,
              card: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

      // 銀行一覧を取得
      const banks = await this.getBanksList(userId);

      // 各取引に履歴残高を付与
      const transactionsWithBalance: TransactionWithHistoricalBalance[] = [];

      for (const transaction of transactions) {
        // この取引時点での履歴残高を計算
        const historicalBalanceResponse = await this.calculateHistoricalBalance(
          userId,
          transaction.date
        );

        if (!historicalBalanceResponse.success || !historicalBalanceResponse.data) {
          continue; // エラーの場合はスキップ
        }

        const historicalBalance = historicalBalanceResponse.data;

        // 取引による変動額を計算
        const transactionImpact = this.calculateTransactionImpact(transaction);

        const transactionWithBalance: TransactionWithHistoricalBalance = {
          ...transaction,
          historicalBalance,
          transactionImpact,
        };

        transactionsWithBalance.push(transactionWithBalance);
      }

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        success: true,
        data: {
          transactions: transactionsWithBalance,
          banks,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
          },
        },
      };
    } catch (error) {
      console.error('履歴残高付き取引取得エラー:', error);
      return { success: false, error: '履歴残高付き取引の取得に失敗しました' };
    }
  }

  /**
   * 銀行一覧を取得
   */
  static async getBanksList(userId: string): Promise<Bank[]> {
    try {
      const banks = await prisma.bank.findMany({
        where: { userId, isActive: true },
        orderBy: { name: 'asc' },
      });
      return banks;
    } catch (error) {
      console.error('銀行一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * 取引による変動額を計算
   */
  private static calculateTransactionImpact(transaction: TransactionWithPaymentMethod) {
    const amount = transaction.amount.toNumber();
    const changeAmount = transaction.type === 'INCOME' ? amount : -amount;

    const impact: {
      cashAmount?: number;
      bankTransactions?: { bankId: string; amount: number }[];
    } = {};

    if (transaction.paymentMethod.type === 'CASH') {
      impact.cashAmount = changeAmount;
    } else if (transaction.paymentMethod.type === 'BANK' && transaction.paymentMethod.bankId) {
      impact.bankTransactions = [{
        bankId: transaction.paymentMethod.bankId,
        amount: changeAmount,
      }];
    }
    // CARD の場合は残高変動なし

    return impact;
  }

}