import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transactions/route';
import { TransactionService } from '@/lib/transactions';
import { auth } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/transactions');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockTransactionService = TransactionService as jest.Mocked<typeof TransactionService>;

describe('/api/transactions', () => {
  const mockUserId = 'test-user-id';
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31',
  };

  const mockTransaction = {
    id: 'transaction-1',
    userId: mockUserId,
    date: new Date('2024-01-15'),
    dayOfWeek: '月',
    paymentMethodId: 'pm-1',
    store: 'テストストア',
    purpose: 'テスト目的',
    type: 'EXPENSE' as const,
    amount: new Decimal(1000),
    cashIncome: null,
    cashExpense: new Decimal(1000),
    cashBalance: new Decimal(9000),
    cardAmount: null,
    cardWithdrawalDate: null,
    bankIncome: null,
    bankExpense: null,
    bankBalance: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentMethod: {
      id: 'pm-1',
      name: '現金',
      type: 'CASH' as const,
      cardId: null,
      bankId: null,
      userId: mockUserId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/transactions', () => {
    it('should return transactions successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockTransactionService.getTransactions = jest.fn().mockResolvedValue({
        success: true,
        data: [mockTransaction],
      });

      const request = new NextRequest('http://localhost/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockTransaction]);
      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith(mockUserId, {});
    });

    it('should handle query parameters for filtering', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockTransactionService.getTransactions = jest.fn().mockResolvedValue({
        success: true,
        data: [mockTransaction],
      });

      const request = new NextRequest('http://localhost/api/transactions?type=expense&paymentMethodId=pm-1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockTransactionService.getTransactions).toHaveBeenCalledWith(mockUserId, {
        type: 'expense',
        paymentMethodId: 'pm-1',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockTransactionService.getTransactions = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = new NextRequest('http://localhost/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/transactions', () => {
    const validTransactionData = {
      date: '2024-01-15',
      paymentMethodId: 'pm-1',
      store: 'テストストア',
      purpose: 'テスト目的',
      type: 'expense' as const,
      amount: 1000,
    };

    it('should create transaction successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockTransactionService.createTransaction = jest.fn().mockResolvedValue({
        success: true,
        data: mockTransaction,
      });

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(validTransactionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockTransaction);
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          date: expect.any(Date),
          paymentMethodId: validTransactionData.paymentMethodId,
          store: validTransactionData.store,
          purpose: validTransactionData.purpose,
          type: 'EXPENSE',
          amount: validTransactionData.amount,
        })
      );
    });

    it('should create income transaction successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      const incomeTransaction = {
        ...mockTransaction,
        type: 'INCOME' as const,
        cashIncome: new Decimal(1000),
        cashExpense: null,
      };
      mockTransactionService.createTransaction = jest.fn().mockResolvedValue({
        success: true,
        data: incomeTransaction,
      });

      const incomeData = {
        ...validTransactionData,
        type: 'income' as const,
      };

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(incomeData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(incomeTransaction);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(validTransactionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockTransactionService.createTransaction = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create transaction',
      });

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(validTransactionData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create transaction');
    });

    it('should validate required fields', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const incompleteData = {
        date: '2024-01-15',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate amount is positive', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const invalidData = {
        ...validTransactionData,
        amount: -1000, // Negative amount
      };

      const request = new NextRequest('http://localhost/api/transactions', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});