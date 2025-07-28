import type { APIResponse } from '@/types';
import type { CardWithdrawalResult } from './card-withdrawal';

export class CardWithdrawalClientService {
  /**
   * 期限切れカード取引の自動処理を実行
   */
  static async processOverdueTransactions(): Promise<APIResponse<CardWithdrawalResult>> {
    try {
      const response = await fetch('/api/card-withdrawals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Card withdrawal processing client error:', error);
      return {
        success: false,
        error: 'カード引き落とし処理の通信に失敗しました'
      };
    }
  }

  /**
   * 指定されたカード取引を手動で銀行取引に変換
   */
  static async convertSingleTransaction(transactionId: string): Promise<APIResponse<any>> {
    try {
      const response = await fetch(`/api/card-withdrawals/convert/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Card transaction conversion client error:', error);
      return {
        success: false,
        error: 'カード取引変換の通信に失敗しました'
      };
    }
  }

  /**
   * 銀行取引に変換されたカード取引を元に戻す
   */
  static async revertTransaction(transactionId: string): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`/api/card-withdrawals/revert/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Card transaction revert client error:', error);
      return {
        success: false,
        error: 'カード取引復元の通信に失敗しました'
      };
    }
  }
}