import type { Balance, BalanceWithBank, BalanceSummary, APIResponse } from '@/types';

export class BalanceService {
  static async getBalanceSummary(): Promise<APIResponse<BalanceSummary>> {
    try {
      const response = await fetch('/api/balances?action=summary');
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '残高サマリーの取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '残高サマリーの取得に失敗しました' };
    }
  }

  static async getBalances(): Promise<APIResponse<BalanceWithBank[]>> {
    try {
      const response = await fetch('/api/balances');
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '残高一覧の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '残高一覧の取得に失敗しました' };
    }
  }

  static async updateBalance(
    type: 'CASH' | 'BANK',
    amount: number,
    bankId?: string
  ): Promise<APIResponse<Balance>> {
    try {
      const response = await fetch('/api/balances', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, amount, bankId }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '残高の更新に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '残高の更新に失敗しました' };
    }
  }

  static async recalculateBalances(): Promise<APIResponse<void>> {
    try {
      const response = await fetch('/api/balances?action=recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '残高の再計算に失敗しました' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '残高の再計算に失敗しました' };
    }
  }
}