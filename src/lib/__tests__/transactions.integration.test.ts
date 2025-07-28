/**
 * Transaction Service のカード引き落とし日計算統合テスト
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TransactionService } from '../transactions';

// モック設定
jest.mock('../prisma', () => ({
  prisma: {
    paymentMethod: {
      findUnique: jest.fn()
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
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

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBalanceService = BalanceService as jest.Mocked<typeof BalanceService>;

describe('TransactionService - Card Integration', () => {
  const userId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction - カード取引', () => {
    const cardPaymentMethod = {
      id: 'pm123',
      type: 'CARD' as const,
      bank: null,
      card: {
        id: 'card123',
        closingDay: 15,
        withdrawalDay: 27,
        withdrawalMonthOffset: 1,
        withdrawalBankId: 'bank123'
      }
    };

    const transactionFormData = {
      userId,
      date: '2024-01-10',
      paymentMethodId: 'pm123',
      store: 'テストストア',
      purpose: 'テスト用途',
      type: 'expense' as const,
      amount: 1000
    };

    test('カード取引作成時に引き落とし日が自動計算される', async () => {
      mockPrisma.paymentMethod.findUnique.mockResolvedValue(cardPaymentMethod);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: cardPaymentMethod
        } as any);
      });

      const result = await TransactionService.createTransaction(transactionFormData);

      expect(result.success).toBe(true);
      expect(createdData.cardAmount).toBe(1000);
      expect(createdData.cardWithdrawalDate).toBeInstanceOf(Date);
      
      // 引き落とし日の計算確認（1月10日利用 → 2月27日引き落とし）
      const withdrawalDate = createdData.cardWithdrawalDate;
      expect(withdrawalDate.getFullYear()).toBe(2024);
      expect(withdrawalDate.getMonth()).toBe(1); // 2月 (0-indexed)
      expect(withdrawalDate.getDate()).toBe(27);
    });

    test('カード取引では残高更新がスキップされる', async () => {
      mockPrisma.paymentMethod.findUnique.mockResolvedValue(cardPaymentMethod);
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans123',
        paymentMethod: cardPaymentMethod
      } as any);

      await TransactionService.createTransaction(transactionFormData);

      // カード取引では残高更新が呼ばれないことを確認
      expect(mockBalanceService.processTransaction).not.toHaveBeenCalled();
    });

    test('締日以降の利用の場合の引き落とし日計算', async () => {
      mockPrisma.paymentMethod.findUnique.mockResolvedValue(cardPaymentMethod);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: cardPaymentMethod
        } as any);
      });

      // 1月20日利用（15日締め後）
      const lateTransactionData = {
        ...transactionFormData,
        date: '2024-01-20'
      };

      await TransactionService.createTransaction(lateTransactionData);

      // 1月20日利用 → 2月分 → 3月27日引き落とし
      const withdrawalDate = createdData.cardWithdrawalDate;
      expect(withdrawalDate.getFullYear()).toBe(2024);
      expect(withdrawalDate.getMonth()).toBe(2); // 3月
      expect(withdrawalDate.getDate()).toBe(27);
    });

    test('翌々月引き落としカードの場合', async () => {
      const nextNextMonthCard = {
        ...cardPaymentMethod,
        card: {
          ...cardPaymentMethod.card,
          withdrawalMonthOffset: 2 // 翌々月
        }
      };

      mockPrisma.paymentMethod.findUnique.mockResolvedValue(nextNextMonthCard);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: nextNextMonthCard
        } as any);
      });

      await TransactionService.createTransaction(transactionFormData);

      // 1月10日利用 → 翌々月 → 3月27日引き落とし
      const withdrawalDate = createdData.cardWithdrawalDate;
      expect(withdrawalDate.getFullYear()).toBe(2024);
      expect(withdrawalDate.getMonth()).toBe(2); // 3月
      expect(withdrawalDate.getDate()).toBe(27);
    });

    test('月末調整が必要な場合', async () => {
      const monthEndCard = {
        ...cardPaymentMethod,
        card: {
          ...cardPaymentMethod.card,
          withdrawalDay: 31 // 31日引き落とし
        }
      };

      mockPrisma.paymentMethod.findUnique.mockResolvedValue(monthEndCard);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: monthEndCard
        } as any);
      });

      await TransactionService.createTransaction(transactionFormData);

      // 1月10日利用 → 2月31日 → 2月28日に調整
      const withdrawalDate = createdData.cardWithdrawalDate;
      expect(withdrawalDate.getFullYear()).toBe(2024);
      expect(withdrawalDate.getMonth()).toBe(1); // 2月
      expect(withdrawalDate.getDate()).toBe(28);
    });

    test('土日調整が必要な場合', async () => {
      const weekendCard = {
        ...cardPaymentMethod,
        card: {
          ...cardPaymentMethod.card,
          withdrawalDay: 2 // 2024年3月2日は土曜日
        }
      };

      mockPrisma.paymentMethod.findUnique.mockResolvedValue(weekendCard);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: weekendCard
        } as any);
      });

      // 2月の取引で3月引き落とし
      const weekendTransactionData = {
        ...transactionFormData,
        date: '2024-02-10'
      };

      await TransactionService.createTransaction(weekendTransactionData);

      // 3月2日(土) → 3月4日(月)に調整
      const withdrawalDate = createdData.cardWithdrawalDate;
      expect(withdrawalDate.getFullYear()).toBe(2024);
      expect(withdrawalDate.getMonth()).toBe(2); // 3月
      expect(withdrawalDate.getDate()).toBe(4);
    });
  });

  describe('createTransaction - 非カード取引', () => {
    const bankPaymentMethod = {
      id: 'pm123',
      type: 'BANK' as const,
      bank: { id: 'bank123' },
      card: null
    };

    const transactionFormData = {
      userId,
      date: '2024-01-10',
      paymentMethodId: 'pm123',
      store: 'テストストア',
      purpose: 'テスト用途',
      type: 'expense' as const,
      amount: 1000
    };

    test('銀行取引では引き落とし日が設定されない', async () => {
      mockPrisma.paymentMethod.findUnique.mockResolvedValue(bankPaymentMethod);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: bankPaymentMethod
        } as any);
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      await TransactionService.createTransaction(transactionFormData);

      expect(createdData.cardAmount).toBeNull();
      expect(createdData.cardWithdrawalDate).toBeUndefined();
      expect(mockBalanceService.processTransaction).toHaveBeenCalled();
    });

    test('現金取引では引き落とし日が設定されない', async () => {
      const cashPaymentMethod = {
        id: 'pm123',
        type: 'CASH' as const,
        bank: null,
        card: null
      };

      mockPrisma.paymentMethod.findUnique.mockResolvedValue(cashPaymentMethod);
      
      let createdData: any;
      mockPrisma.transaction.create.mockImplementation(({ data }) => {
        createdData = data;
        return Promise.resolve({
          id: 'trans123',
          ...data,
          paymentMethod: cashPaymentMethod
        } as any);
      });
      mockBalanceService.processTransaction.mockResolvedValue({ success: true });

      await TransactionService.createTransaction(transactionFormData);

      expect(createdData.cardAmount).toBeNull();
      expect(createdData.cardWithdrawalDate).toBeUndefined();
      expect(mockBalanceService.processTransaction).toHaveBeenCalled();
    });
  });

  describe('エラーケース', () => {
    test('支払い方法が見つからない場合', async () => {
      mockPrisma.paymentMethod.findUnique.mockResolvedValue(null);

      const result = await TransactionService.createTransaction({
        userId,
        date: '2024-01-10',
        paymentMethodId: 'invalid-id',
        store: 'テストストア',
        purpose: 'テスト用途',
        type: 'expense',
        amount: 1000
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('指定された支払い方法が見つかりません');
    });

    test('カード情報が不完全な場合', async () => {
      const incompleteCardPaymentMethod = {
        id: 'pm123',
        type: 'CARD' as const,
        bank: null,
        card: null // カード情報がない
      };

      mockPrisma.paymentMethod.findUnique.mockResolvedValue(incompleteCardPaymentMethod);
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'trans123',
        paymentMethod: incompleteCardPaymentMethod
      } as any);

      const result = await TransactionService.createTransaction({
        userId,
        date: '2024-01-10',
        paymentMethodId: 'pm123',
        store: 'テストストア',
        purpose: 'テスト用途',
        type: 'expense',
        amount: 1000
      });

      // カード情報がなくても取引は作成されるが、引き落とし日は設定されない
      expect(result.success).toBe(true);
    });
  });
});