/**
 * カード引き落とし処理サービス
 * 
 * 期限切れのカード取引を自動的に銀行取引に変換し、
 * 適切な残高更新を行う
 */

import { prisma } from './prisma';
import { BalanceService } from './balance';
import { calculateWithdrawalDate, isOverdue, type CardConfig } from './card-utils';
import type { APIResponse } from '@/types';

export interface CardWithdrawalResult {
  processedCount: number;
  convertedTransactions: string[];
  errors: string[];
}

export class CardWithdrawalService {
  /**
   * 期限切れカード取引を自動処理
   * @param userId ユーザーID
   * @returns 処理結果
   */
  static async processOverdueCardTransactions(
    userId: string
  ): Promise<APIResponse<CardWithdrawalResult>> {
    try {
      const result: CardWithdrawalResult = {
        processedCount: 0,
        convertedTransactions: [],
        errors: []
      };

      // 期限切れのカード取引を取得
      const overdueTransactions = await this.findOverdueCardTransactions(userId);
      
      for (const transaction of overdueTransactions) {
        try {
          const converted = await this.convertCardTransactionToBankExpense(transaction.id, userId);
          if (converted.success) {
            result.processedCount++;
            result.convertedTransactions.push(transaction.id);
          } else {
            result.errors.push(`Transaction ${transaction.id}: ${converted.error}`);
          }
        } catch (error) {
          result.errors.push(`Transaction ${transaction.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Card withdrawal processing error:', error);
      return { 
        success: false, 
        error: 'カード引き落とし処理中にエラーが発生しました' 
      };
    }
  }

  /**
   * 期限切れカード取引を検索
   */
  private static async findOverdueCardTransactions(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.transaction.findMany({
      where: {
        userId,
        cardWithdrawalDate: {
          lte: today
        },
        bankExpense: null, // まだ変換されていない
        paymentMethod: {
          type: 'CARD'
        }
      },
      include: {
        paymentMethod: {
          include: {
            card: true
          }
        }
      }
    });
  }

  /**
   * カード取引を銀行支出取引に変換
   * @param transactionId 取引ID
   * @param userId ユーザーID
   * @returns 変換結果
   */
  static async convertCardTransactionToBankExpense(
    transactionId: string,
    userId: string
  ): Promise<APIResponse<void>> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 元の取引を取得
        const originalTransaction = await tx.transaction.findFirst({
          where: { id: transactionId, userId },
          include: {
            paymentMethod: {
              include: {
                card: true
              }
            }
          }
        });

        if (!originalTransaction || !originalTransaction.paymentMethod.card) {
          return { success: false, error: '取引またはカード情報が見つかりません' };
        }

        // 重複変換チェック
        if (originalTransaction.bankExpense !== null) {
          return { success: false, error: '既に変換済みの取引です' };
        }

        const card = originalTransaction.paymentMethod.card;

        // 引き落とし日を設定（まだ設定されていない場合）
        let withdrawalDate = originalTransaction.cardWithdrawalDate;
        if (!withdrawalDate) {
          const config: CardConfig = {
            closingDay: card.closingDay,
            withdrawalDay: card.withdrawalDay,
            withdrawalMonthOffset: card.withdrawalMonthOffset
          };
          withdrawalDate = calculateWithdrawalDate(originalTransaction.date, config);
        }

        // 銀行取引として記録
        const bankExpenseAmount = originalTransaction.cardAmount || originalTransaction.amount;
        
        // 元取引を更新（銀行支出額を設定）
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            bankExpense: bankExpenseAmount,
            cardWithdrawalDate: withdrawalDate
          }
        });

        // 銀行残高を更新
        await BalanceService.processTransaction(
          userId,
          'BANK',
          card.withdrawalBankId,
          bankExpenseAmount,
          'EXPENSE'
        );

        return { success: true };
      });
    } catch (error) {
      console.error('Card to bank conversion error:', error);
      return { 
        success: false, 
        error: 'カード取引の銀行取引変換に失敗しました' 
      };
    }
  }

  /**
   * 銀行取引変換を取り消し
   * @param transactionId 取引ID
   * @param userId ユーザーID
   * @returns 取り消し結果
   */
  static async revertBankConversion(
    transactionId: string,
    userId: string
  ): Promise<APIResponse<void>> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 取引を取得
        const transaction = await tx.transaction.findFirst({
          where: { id: transactionId, userId },
          include: {
            paymentMethod: {
              include: {
                card: true
              }
            }
          }
        });

        if (!transaction || !transaction.paymentMethod.card) {
          return { success: false, error: '取引またはカード情報が見つかりません' };
        }

        // 変換済みかチェック
        if (!transaction.bankExpense) {
          return { success: false, error: '変換されていない取引です' };
        }

        const card = transaction.paymentMethod.card;
        const bankExpenseAmount = transaction.bankExpense;

        // 取引を元に戻す
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            bankExpense: null
          }
        });

        // 銀行残高を戻す（支出を収入として処理）
        await BalanceService.processTransaction(
          userId,
          'BANK',
          card.withdrawalBankId,
          bankExpenseAmount,
          'INCOME'
        );

        return { success: true };
      });
    } catch (error) {
      console.error('Bank conversion revert error:', error);
      return { 
        success: false, 
        error: '銀行取引変換の取り消しに失敗しました' 
      };
    }
  }

  /**
   * カード取引の引き落とし日を更新
   * @param transactionId 取引ID
   * @param userId ユーザーID
   * @returns 更新結果
   */
  static async updateWithdrawalDate(
    transactionId: string,
    userId: string
  ): Promise<APIResponse<void>> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { id: transactionId, userId },
        include: {
          paymentMethod: {
            include: {
              card: true
            }
          }
        }
      });

      if (!transaction || !transaction.paymentMethod.card) {
        return { success: false, error: '取引またはカード情報が見つかりません' };
      }

      const card = transaction.paymentMethod.card;
      const config: CardConfig = {
        closingDay: card.closingDay,
        withdrawalDay: card.withdrawalDay,
        withdrawalMonthOffset: card.withdrawalMonthOffset
      };

      const withdrawalDate = calculateWithdrawalDate(transaction.date, config);

      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          cardWithdrawalDate: withdrawalDate
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Withdrawal date update error:', error);
      return { 
        success: false, 
        error: '引き落とし日の更新に失敗しました' 
      };
    }
  }
}