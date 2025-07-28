import { prisma } from './prisma';
import { BalanceService } from './balance';
import { isWithdrawalDatePassed } from './card-utils';
import type { APIResponse } from '@/types';

export interface CardWithdrawalResult {
  processedCount: number;
  errors: string[];
  processedTransactions: {
    originalId: string;
    bankTransactionId: string;
    amount: number;
    withdrawalDate: string;
  }[];
}

export class CardWithdrawalService {
  /**
   * 期限切れのカード取引を検索して銀行取引に変換
   * 
   * @param userId ユーザーID
   * @returns 処理結果
   */
  static async processOverdueCardTransactions(userId: string): Promise<APIResponse<CardWithdrawalResult>> {
    try {
      const result: CardWithdrawalResult = {
        processedCount: 0,
        errors: [],
        processedTransactions: []
      };

      // 期限切れのカード取引を取得
      const overdueTransactions = await this.findOverdueCardTransactions(userId);

      for (const transaction of overdueTransactions) {
        try {
          const bankTransaction = await this.convertCardToBankTransaction(transaction);
          
          if (bankTransaction) {
            result.processedCount++;
            result.processedTransactions.push({
              originalId: transaction.id,
              bankTransactionId: bankTransaction.id,
              amount: Number(transaction.amount),
              withdrawalDate: transaction.cardWithdrawalDate?.toISOString() || ''
            });
          }
        } catch (error) {
          const errorMessage = `取引ID ${transaction.id} の処理に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);
          console.error('Card withdrawal conversion error:', error);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Card withdrawal processing error:', error);
      return { 
        success: false, 
        error: 'カード引き落とし処理に失敗しました' 
      };
    }
  }

  /**
   * 期限切れのカード取引を検索
   */
  private static async findOverdueCardTransactions(userId: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 当日末まで

    return await prisma.transaction.findMany({
      where: {
        userId,
        paymentMethod: {
          type: 'CARD'
        },
        cardWithdrawalDate: {
          not: null,
          lte: today
        },
        // 既に銀行取引に変換されていない（目印として bankIncome または bankExpense が設定されていない）
        AND: [
          { bankIncome: null },
          { bankExpense: null }
        ]
      },
      include: {
        paymentMethod: {
          include: {
            card: {
              include: {
                withdrawalBank: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * カード取引を銀行取引に変換
   */
  private static async convertCardToBankTransaction(cardTransaction: any) {
    const card = cardTransaction.paymentMethod.card;
    const withdrawalBank = card.withdrawalBank;

    if (!card || !withdrawalBank) {
      throw new Error(`カード情報または引き落とし銀行が見つかりません`);
    }

    // トランザクション内で処理してデータ整合性を保つ
    return await prisma.$transaction(async (tx) => {
      // 銀行の支払い方法を取得
      const bankPaymentMethod = await tx.paymentMethod.findFirst({
        where: {
          userId: cardTransaction.userId,
          bankId: withdrawalBank.id,
          type: 'BANK',
          isActive: true
        }
      });

      if (!bankPaymentMethod) {
        throw new Error(`引き落とし銀行 ${withdrawalBank.name} の支払い方法が見つかりません`);
      }

      // 新しい銀行取引を作成
      const bankTransaction = await tx.transaction.create({
        data: {
          userId: cardTransaction.userId,
          date: cardTransaction.cardWithdrawalDate || new Date(),
          dayOfWeek: (cardTransaction.cardWithdrawalDate || new Date()).toLocaleDateString('ja-JP', { weekday: 'short' }),
          paymentMethodId: bankPaymentMethod.id,
          store: cardTransaction.store ? `${cardTransaction.store} (カード引き落とし)` : 'カード引き落とし',
          purpose: `${card.name}引き落とし${cardTransaction.purpose ? ` - ${cardTransaction.purpose}` : ''}`,
          type: 'EXPENSE', // 銀行からの支出
          amount: cardTransaction.amount,
          bankExpense: cardTransaction.amount,
          // 元のカード取引との関連を示すメタデータ
          cashIncome: null,
          cashExpense: null,
          cashBalance: null,
          cardAmount: null,
          cardWithdrawalDate: null,
          bankIncome: null,
          bankBalance: null
        }
      });

      // 元のカード取引を更新して変換済みであることを示す
      await tx.transaction.update({
        where: { id: cardTransaction.id },
        data: {
          bankExpense: cardTransaction.amount, // 銀行取引に変換済みの目印
          store: cardTransaction.store ? `${cardTransaction.store} (変換済み)` : '(変換済み)'
        }
      });

      // 銀行残高を更新
      await BalanceService.processTransaction(
        cardTransaction.userId,
        'BANK',
        withdrawalBank.id,
        Number(cardTransaction.amount),
        'EXPENSE'
      );

      return bankTransaction;
    });
  }

  /**
   * 指定されたカード取引を手動で銀行取引に変換
   * 
   * @param transactionId 取引ID
   * @param userId ユーザーID
   * @returns 変換結果
   */
  static async convertSingleCardTransaction(transactionId: string, userId: string): Promise<APIResponse<any>> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
          paymentMethod: {
            type: 'CARD'
          }
        },
        include: {
          paymentMethod: {
            include: {
              card: {
                include: {
                  withdrawalBank: true
                }
              }
            }
          }
        }
      });

      if (!transaction) {
        return { success: false, error: 'カード取引が見つかりません' };
      }

      // 既に変換済みかチェック
      if (transaction.bankExpense !== null) {
        return { success: false, error: 'この取引は既に銀行取引に変換済みです' };
      }

      const bankTransaction = await this.convertCardToBankTransaction(transaction);

      return { 
        success: true, 
        data: {
          original: transaction,
          bankTransaction
        }
      };
    } catch (error) {
      console.error('Single card transaction conversion error:', error);
      return { 
        success: false, 
        error: 'カード取引の変換に失敗しました' 
      };
    }
  }

  /**
   * 銀行取引に変換されたカード取引を元に戻す
   * 
   * @param transactionId 元のカード取引ID
   * @param userId ユーザーID
   * @returns 復元結果
   */
  static async revertCardTransaction(transactionId: string, userId: string): Promise<APIResponse<void>> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
          paymentMethod: {
            type: 'CARD'
          },
          bankExpense: { not: null } // 変換済みのもののみ
        },
        include: {
          paymentMethod: {
            include: {
              card: {
                include: {
                  withdrawalBank: true
                }
              }
            }
          }
        }
      });

      if (!transaction) {
        return { success: false, error: '変換済みのカード取引が見つかりません' };
      }

      const card = transaction.paymentMethod.card;
      const withdrawalBank = card?.withdrawalBank;

      if (!withdrawalBank) {
        return { success: false, error: '引き落とし銀行情報が見つかりません' };
      }

      await prisma.$transaction(async (tx) => {
        // 対応する銀行取引を削除
        const bankTransactions = await tx.transaction.findMany({
          where: {
            userId,
            paymentMethod: {
              bankId: withdrawalBank.id,
              type: 'BANK'
            },
            amount: transaction.amount,
            type: 'EXPENSE',
            // 日付範囲で絞り込み（引き落とし日前後1日）
            date: {
              gte: new Date(transaction.cardWithdrawalDate!.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(transaction.cardWithdrawalDate!.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });

        for (const bankTransaction of bankTransactions) {
          await tx.transaction.delete({
            where: { id: bankTransaction.id }
          });

          // 銀行残高を戻す
          await BalanceService.processTransaction(
            userId,
            'BANK',
            withdrawalBank.id,
            Number(transaction.amount),
            'INCOME' // 支出を戻すので収入として処理
          );
        }

        // 元のカード取引を未変換状態に戻す
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            bankExpense: null,
            store: transaction.store?.replace(' (変換済み)', '') || null
          }
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Card transaction revert error:', error);
      return { 
        success: false, 
        error: 'カード取引の復元に失敗しました' 
      };
    }
  }
}