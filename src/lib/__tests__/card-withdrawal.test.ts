/**
 * カード引き落とし処理サービスのテスト
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { CardWithdrawalService } from '../card-withdrawal';

// モック設定
jest.mock('../prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    transaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('../balance', () => ({
  BalanceService: {
    processTransaction: jest.fn()
  }
}));

import { prisma } from '../prisma';
import { BalanceService } from '../balance';

const mockPrisma = prisma as any;
const mockBalanceService = BalanceService as any;

describe('CardWithdrawalService', () => {
  const userId = 'user123';
  const transactionId = 'trans123';
  const cardId = 'card123';
  const bankId = 'bank123';

  // テスト用のモックデータ
  const mockCard = {
    id: cardId,
    closingDay: 15,
    withdrawalDay: 27,
    withdrawalMonthOffset: 1,
    withdrawalBankId: bankId
  };

  const mockTransaction = {
    id: transactionId,
    userId,
    date: new Date('2024-01-10'),
    amount: 1000,
    cardAmount: 1000,
    cardWithdrawalDate: new Date('2024-02-27'),
    bankExpense: null,
    paymentMethod: {
      type: 'CARD',
      card: mockCard
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processOverdueCardTransactions', () => {
    test('期限切れ取引が正常に処理される', async () => {
      // モック設定
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(mockTransaction),
            update: jest.fn().mockResolvedValue(mockTransaction)
          }
        });
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      const result = await CardWithdrawalService.processOverdueCardTransactions(userId);

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(1);
      expect(result.data?.convertedTransactions).toContain(transactionId);
      expect(result.data?.errors).toHaveLength(0);
    });

    test('期限切れ取引がない場合', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await CardWithdrawalService.processOverdueCardTransactions(userId);

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(0);
      expect(result.data?.convertedTransactions).toHaveLength(0);
      expect(result.data?.errors).toHaveLength(0);
    });

    test('一部の変換でエラーが発生した場合', async () => {
      const failingTransaction = { ...mockTransaction, id: 'trans456' };
      mockPrisma.transaction.findMany.mockResolvedValue([mockTransaction, failingTransaction]);
      
      let callCount = 0;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('変換エラー');
        }
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(mockTransaction),
            update: jest.fn().mockResolvedValue(mockTransaction)
          }
        });
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      const result = await CardWithdrawalService.processOverdueCardTransactions(userId);

      expect(result.success).toBe(true);
      expect(result.data?.processedCount).toBe(1);
      expect(result.data?.convertedTransactions).toContain(transactionId);
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.errors[0]).toContain('trans456');
    });

    test('データベースエラー時の処理', async () => {
      mockPrisma.transaction.findMany.mockRejectedValue(new Error('DB Error'));

      const result = await CardWithdrawalService.processOverdueCardTransactions(userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('カード引き落とし処理中にエラーが発生しました');
    });
  });

  describe('convertCardTransactionToBankExpense', () => {
    test('カード取引の銀行取引変換が成功', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(mockTransaction),
            update: jest.fn().mockResolvedValue({
              ...mockTransaction,
              bankExpense: mockTransaction.cardAmount
            })
          }
        });
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      const result = await CardWithdrawalService.convertCardTransactionToBankExpense(transactionId, userId);

      expect(result.success).toBe(true);
      expect(mockBalanceService.processTransaction).toHaveBeenCalledWith(
        userId,
        'BANK',
        bankId,
        mockTransaction.cardAmount,
        'EXPENSE'
      );
    });

    test('取引が見つからない場合', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null)
          }
        });
      });

      const result = await CardWithdrawalService.convertCardTransactionToBankExpense(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('取引またはカード情報が見つかりません');
    });

    test('既に変換済みの取引の場合', async () => {
      const convertedTransaction = {
        ...mockTransaction,
        bankExpense: 1000
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(convertedTransaction)
          }
        });
      });

      const result = await CardWithdrawalService.convertCardTransactionToBankExpense(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('既に変換済みの取引です');
    });

    test('cardWithdrawalDateが未設定の場合の自動計算', async () => {
      const transactionWithoutWithdrawalDate = {
        ...mockTransaction,
        cardWithdrawalDate: null
      };

      let updateCallData: any;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(transactionWithoutWithdrawalDate),
            update: jest.fn().mockImplementation((params) => {
              updateCallData = params.data;
              return Promise.resolve(mockTransaction);
            })
          }
        });
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      const result = await CardWithdrawalService.convertCardTransactionToBankExpense(transactionId, userId);

      expect(result.success).toBe(true);
      expect(updateCallData.cardWithdrawalDate).toBeInstanceOf(Date);
      expect(updateCallData.bankExpense).toBe(mockTransaction.cardAmount);
    });
  });

  describe('revertBankConversion', () => {
    test('銀行取引変換の取り消しが成功', async () => {
      const convertedTransaction = {
        ...mockTransaction,
        bankExpense: 1000
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(convertedTransaction),
            update: jest.fn().mockResolvedValue({
              ...convertedTransaction,
              bankExpense: null
            })
          }
        });
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      const result = await CardWithdrawalService.revertBankConversion(transactionId, userId);

      expect(result.success).toBe(true);
      expect(mockBalanceService.processTransaction).toHaveBeenCalledWith(
        userId,
        'BANK',
        bankId,
        1000,
        'INCOME' // 戻すときは収入として処理
      );
    });

    test('変換されていない取引の取り消し試行', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(mockTransaction) // bankExpense: null
          }
        });
      });

      const result = await CardWithdrawalService.revertBankConversion(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('変換されていない取引です');
    });

    test('取引が見つからない場合', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          transaction: {
            findFirst: jest.fn().mockResolvedValue(null)
          }
        });
      });

      const result = await CardWithdrawalService.revertBankConversion(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('取引またはカード情報が見つかりません');
    });
  });

  describe('updateWithdrawalDate', () => {
    test('引き落とし日の更新が成功', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(mockTransaction);
      mockPrisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        cardWithdrawalDate: new Date('2024-02-27')
      });

      const result = await CardWithdrawalService.updateWithdrawalDate(transactionId, userId);

      expect(result.success).toBe(true);
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          cardWithdrawalDate: expect.any(Date)
        }
      });
    });

    test('取引が見つからない場合', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      const result = await CardWithdrawalService.updateWithdrawalDate(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('取引またはカード情報が見つかりません');
    });

    test('データベースエラー時の処理', async () => {
      mockPrisma.transaction.findFirst.mockRejectedValue(new Error('DB Error'));

      const result = await CardWithdrawalService.updateWithdrawalDate(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('引き落とし日の更新に失敗しました');
    });
  });

  describe('エラーハンドリング', () => {
    test('予期しないエラーのハンドリング', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Unexpected error'));

      const result = await CardWithdrawalService.convertCardTransactionToBankExpense(transactionId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('カード取引の銀行取引変換に失敗しました');
    });

    test('不正なパラメータでのエラーハンドリング', async () => {
      const result = await CardWithdrawalService.convertCardTransactionToBankExpense('', '');

      expect(result.success).toBe(false);
    });
  });
});