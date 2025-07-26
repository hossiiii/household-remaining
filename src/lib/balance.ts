import { prisma } from './prisma';
import type { Balance, BalanceWithBank, BalanceSummary, APIResponse } from '@/types';

export class BalanceService {
  // 残高サマリーを取得
  static async getBalanceSummary(userId: string): Promise<APIResponse<BalanceSummary>> {
    try {
      const balances = await prisma.balance.findMany({
        where: { userId },
        include: { bank: true },
      });

      const cashBalance = balances
        .find(b => b.type === 'CASH')?.amount.toNumber() || 0;

      const bankBalances = balances
        .filter(b => b.type === 'BANK' && b.bank)
        .map(b => ({
          bankId: b.bankId!,
          bankName: b.bank!.name,
          branchName: b.bank!.branchName || undefined,
          balance: b.amount.toNumber(),
        }));

      const totalBalance = cashBalance + bankBalances.reduce((sum, b) => sum + b.balance, 0);

      const summary: BalanceSummary = {
        cashBalance,
        bankBalances,
        totalBalance,
      };

      return { success: true, data: summary };
    } catch (error) {
      console.error('残高サマリー取得エラー:', error);
      return { success: false, error: '残高情報の取得に失敗しました' };
    }
  }

  // 残高を更新
  static async updateBalance(
    userId: string,
    type: 'CASH' | 'BANK',
    amount: number,
    bankId?: string
  ): Promise<APIResponse<Balance>> {
    try {
      if (type === 'BANK' && !bankId) {
        return { success: false, error: '銀行残高の場合は銀行IDが必要です' };
      }

      // 既存の残高を検索
      const existingBalance = await prisma.balance.findFirst({
        where: {
          userId,
          type,
          bankId: bankId || null,
        },
      });

      let balance;
      if (existingBalance) {
        // 更新
        balance = await prisma.balance.update({
          where: { id: existingBalance.id },
          data: { amount },
        });
      } else {
        // 新規作成
        balance = await prisma.balance.create({
          data: {
            userId,
            type,
            bankId: bankId || null,
            amount,
          },
        });
      }

      return { success: true, data: balance };
    } catch (error) {
      console.error('残高更新エラー:', error);
      return { success: false, error: '残高の更新に失敗しました' };
    }
  }

  // 取引による残高変動を処理
  static async processTransaction(
    userId: string,
    paymentMethodType: 'CASH' | 'CARD' | 'BANK',
    bankId: string | null,
    amount: number,
    transactionType: 'INCOME' | 'EXPENSE'
  ): Promise<APIResponse<void>> {
    try {
      // カード取引の場合は残高変動なし（後で引き落としされるため）
      if (paymentMethodType === 'CARD') {
        return { success: true };
      }

      const balanceType = paymentMethodType; // 'CASH' または 'BANK'
      const changeAmount = transactionType === 'INCOME' ? amount : -amount;

      // 現在の残高を取得
      const currentBalance = await prisma.balance.findFirst({
        where: {
          userId,
          type: balanceType,
          bankId: balanceType === 'BANK' ? bankId : null,
        },
      });

      const newAmount = currentBalance 
        ? currentBalance.amount.toNumber() + changeAmount
        : changeAmount;

      // 残高を更新
      await this.updateBalance(userId, balanceType, newAmount, bankId || undefined);

      return { success: true };
    } catch (error) {
      console.error('取引処理エラー:', error);
      return { success: false, error: '取引による残高更新に失敗しました' };
    }
  }

  // 既存取引データから残高を再計算
  static async recalculateBalances(userId: string): Promise<APIResponse<void>> {
    try {
      // 既存残高をリセット
      await prisma.balance.deleteMany({
        where: { userId },
      });

      // 取引データを取得してバランスを再計算
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        include: {
          paymentMethod: {
            include: {
              bank: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      });

      const balances = new Map<string, number>(); // key: "CASH" or "BANK_${bankId}"

      for (const transaction of transactions) {
        const { paymentMethod, type, amount } = transaction;
        
        // カード取引はスキップ
        if (paymentMethod.type === 'CARD') continue;

        const key = paymentMethod.type === 'CASH' 
          ? 'CASH' 
          : `BANK_${paymentMethod.bankId}`;

        const changeAmount = type === 'INCOME' 
          ? amount.toNumber() 
          : -amount.toNumber();

        balances.set(key, (balances.get(key) || 0) + changeAmount);
      }

      // 計算結果をデータベースに保存
      for (const [key, amount] of balances.entries()) {
        if (key === 'CASH') {
          await this.updateBalance(userId, 'CASH', amount);
        } else {
          const bankId = key.replace('BANK_', '');
          await this.updateBalance(userId, 'BANK', amount, bankId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('残高再計算エラー:', error);
      return { success: false, error: '残高の再計算に失敗しました' };
    }
  }

  // 残高一覧を取得（詳細データ付き）
  static async getBalances(userId: string): Promise<APIResponse<BalanceWithBank[]>> {
    try {
      const balances = await prisma.balance.findMany({
        where: { userId },
        include: { bank: true },
        orderBy: [
          { type: 'asc' }, // CASH, BANK の順
          { bank: { name: 'asc' } }, // 銀行名順
        ],
      });

      // null を undefined に変換
      const balancesWithBank = balances.map(balance => ({
        ...balance,
        bank: balance.bank || undefined,
      }));

      return { success: true, data: balancesWithBank };
    } catch (error) {
      console.error('残高一覧取得エラー:', error);
      return { success: false, error: '残高一覧の取得に失敗しました' };
    }
  }
}