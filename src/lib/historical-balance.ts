import { prisma } from './prisma';
import type { BalanceSummary, TransactionWithPaymentMethod, APIResponse } from '@/types';

/**
 * 履歴残高データ
 */
export interface HistoricalBalance {
  cash: number;
  banks: { bankId: string; bankName: string; balance: number }[];
}

/**
 * 履歴残高付き取引データ
 */
export interface TransactionWithHistoricalBalance extends TransactionWithPaymentMethod {
  historicalBalance: HistoricalBalance;
  transactionImpact: {
    cashAmount?: number;
    bankTransactions?: { bankId: string; amount: number }[];
  };
}

/**
 * CSV用拡張データ
 */
export interface CSVRowWithBalance {
  date: string;
  paymentMethod: string;
  store: string;
  purpose: string;
  type: string;
  amount: number;
  cashTransaction: number | '';
  cashBalance: number;
  [key: string]: number | string; // 動的な銀行取引列・残高列
}

/**
 * 履歴残高計算サービス
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
      // 現在の残高を取得
      const currentBalances = await prisma.balance.findMany({
        where: { userId },
        include: { bank: true },
      });

      // 指定日以降の取引を取得
      const transactionsAfterDate = await prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gt: targetDate,
          },
        },
        include: {
          paymentMethod: {
            include: {
              bank: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      // 現金残高の計算
      const currentCashBalance = currentBalances
        .find(b => b.type === 'CASH')?.amount.toNumber() || 0;
      
      const cashTransactionsAfter = transactionsAfterDate
        .filter(t => t.paymentMethod.type === 'CASH')
        .reduce((sum, t) => {
          const change = t.type === 'INCOME' ? t.amount.toNumber() : -t.amount.toNumber();
          return sum + change;
        }, 0);
      
      const historicalCashBalance = currentCashBalance - cashTransactionsAfter;

      // 銀行別残高の計算
      const currentBankBalances = currentBalances
        .filter(b => b.type === 'BANK' && b.bank)
        .map(b => ({
          bankId: b.bankId!,
          bankName: b.bank!.name,
          currentBalance: b.amount.toNumber(),
        }));

      const historicalBankBalances = currentBankBalances.map(bank => {
        const bankTransactionsAfter = transactionsAfterDate
          .filter(t => t.paymentMethod.type === 'BANK' && t.paymentMethod.bankId === bank.bankId)
          .reduce((sum, t) => {
            const change = t.type === 'INCOME' ? t.amount.toNumber() : -t.amount.toNumber();
            return sum + change;
          }, 0);

        return {
          bankId: bank.bankId,
          bankName: bank.bankName,
          balance: bank.currentBalance - bankTransactionsAfter,
        };
      });

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
    filter?: {
      startDate?: Date;
      endDate?: Date;
      paymentMethodId?: string;
      type?: 'income' | 'expense' | 'all';
      store?: string;
      purpose?: string;
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<APIResponse<{
    transactions: TransactionWithHistoricalBalance[];
    banks: { id: string; name: string }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    try {
      // 通常の取引データを取得
      const whereClause: any = { userId };
      
      if (filter) {
        if (filter.startDate) whereClause.date = { ...whereClause.date, gte: filter.startDate };
        if (filter.endDate) whereClause.date = { ...whereClause.date, lte: filter.endDate };
        if (filter.paymentMethodId) whereClause.paymentMethodId = filter.paymentMethodId;
        if (filter.type && filter.type !== 'all') {
          whereClause.type = filter.type.toUpperCase();
        }
        if (filter.store) whereClause.store = { contains: filter.store };
        if (filter.purpose) whereClause.purpose = { contains: filter.purpose };
      }

      // 総数を取得
      const total = await prisma.transaction.count({ where: whereClause });

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        include: {
          paymentMethod: {
            include: {
              card: true,
              bank: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: pagination ? (pagination.page - 1) * pagination.limit : 0,
        take: pagination?.limit,
      });

      // 銀行一覧を取得
      const banks = await prisma.bank.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      // 各取引に履歴残高を付与
      const transactionsWithBalance: TransactionWithHistoricalBalance[] = [];
      
      for (const transaction of transactions) {
        // 取引日時点での履歴残高を計算
        const historicalBalanceResult = await this.calculateHistoricalBalance(
          userId, 
          transaction.date
        );
        
        if (!historicalBalanceResult.success || !historicalBalanceResult.data) {
          continue;
        }

        // 取引の影響を計算
        const transactionImpact: TransactionWithHistoricalBalance['transactionImpact'] = {};
        
        if (transaction.paymentMethod.type === 'CASH') {
          const amount = transaction.type === 'INCOME' 
            ? transaction.amount.toNumber() 
            : -transaction.amount.toNumber();
          transactionImpact.cashAmount = amount;
        } else if (transaction.paymentMethod.type === 'BANK' && transaction.paymentMethod.bankId) {
          const amount = transaction.type === 'INCOME' 
            ? transaction.amount.toNumber() 
            : -transaction.amount.toNumber();
          transactionImpact.bankTransactions = [{
            bankId: transaction.paymentMethod.bankId,
            amount,
          }];
        }

        transactionsWithBalance.push({
          ...transaction,
          paymentMethod: {
            ...transaction.paymentMethod,
            card: transaction.paymentMethod.card || undefined,
            bank: transaction.paymentMethod.bank || undefined,
          },
          historicalBalance: historicalBalanceResult.data,
          transactionImpact,
        });
      }

      // ページネーション情報を計算
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          transactions: transactionsWithBalance,
          banks,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      console.error('履歴残高付き取引取得エラー:', error);
      return { success: false, error: '履歴残高付き取引データの取得に失敗しました' };
    }
  }

  /**
   * 銀行一覧を取得
   */
  static async getBanksList(userId: string): Promise<APIResponse<{ id: string; name: string }[]>> {
    try {
      const banks = await prisma.bank.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: banks };
    } catch (error) {
      console.error('銀行一覧取得エラー:', error);
      return { success: false, error: '銀行一覧の取得に失敗しました' };
    }
  }
}