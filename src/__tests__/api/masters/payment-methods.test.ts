import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/masters/payment-methods/route';
import { MasterService } from '@/lib/masters';
import { auth } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/masters');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMasterService = MasterService as jest.Mocked<typeof MasterService>;

describe('/api/masters/payment-methods', () => {
  const mockUserId = 'test-user-id';
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31',
  };

  const mockPaymentMethod = {
    id: 'pm-1',
    name: 'テスト支払い方法',
    type: 'CARD' as const,
    cardId: 'card-1',
    bankId: null,
    isActive: true,
    userId: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    card: {
      id: 'card-1',
      name: 'テストカード',
      type: 'CREDIT_CARD' as const,
    },
    bank: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/masters/payment-methods', () => {
    it('should return payment methods successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getPaymentMethods = jest.fn().mockResolvedValue({
        success: true,
        data: [mockPaymentMethod],
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockPaymentMethod]);
      expect(mockMasterService.getPaymentMethods).toHaveBeenCalledWith(mockUserId);
    });

    it('should initialize payment methods when initialize=true', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getAvailablePaymentMethods = jest.fn().mockResolvedValue({
        success: true,
        data: [mockPaymentMethod],
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods?initialize=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockPaymentMethod]);
      expect(mockMasterService.getAvailablePaymentMethods).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/payment-methods');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getPaymentMethods = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getPaymentMethods = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/masters/payment-methods');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 400 when initialize fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getAvailablePaymentMethods = jest.fn().mockResolvedValue({
        success: false,
        error: 'Initialization failed',
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods?initialize=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Initialization failed');
    });
  });

  describe('POST /api/masters/payment-methods', () => {
    const validPaymentMethodData = {
      name: 'テスト支払い方法',
      type: 'CARD' as const,
      cardId: 'card-1',
      bankId: null,
      isActive: true,
    };

    it('should create payment method successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createPaymentMethod = jest.fn().mockResolvedValue({
        success: true,
        data: mockPaymentMethod,
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(validPaymentMethodData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockPaymentMethod);
      expect(mockMasterService.createPaymentMethod).toHaveBeenCalledWith(mockUserId, {
        name: validPaymentMethodData.name,
        type: validPaymentMethodData.type,
        cardId: validPaymentMethodData.cardId,
        bankId: validPaymentMethodData.bankId,
        isActive: validPaymentMethodData.isActive,
      });
    });

    it('should create CASH payment method successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      const cashPaymentMethod = {
        ...mockPaymentMethod,
        type: 'CASH' as const,
        cardId: null,
        bankId: null,
        card: undefined,
        bank: undefined,
      };
      mockMasterService.createPaymentMethod = jest.fn().mockResolvedValue({
        success: true,
        data: cashPaymentMethod,
      });

      const cashData = {
        name: '現金',
        type: 'CASH' as const,
        isActive: true,
      };

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(cashData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(cashPaymentMethod);
    });

    it('should create BANK payment method successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      const bankPaymentMethod = {
        ...mockPaymentMethod,
        type: 'BANK' as const,
        cardId: null,
        bankId: 'bank-1',
        card: undefined,
        bank: { id: 'bank-1', name: 'テスト銀行' },
      };
      mockMasterService.createPaymentMethod = jest.fn().mockResolvedValue({
        success: true,
        data: bankPaymentMethod,
      });

      const bankData = {
        name: 'テスト銀行振込',
        type: 'BANK' as const,
        bankId: 'bank-1',
        isActive: true,
      };

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(bankData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(bankPaymentMethod);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(validPaymentMethodData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createPaymentMethod = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create payment method',
      });

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(validPaymentMethodData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create payment method');
    });

    it('should validate required fields', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const incompleteData = {
        name: 'テスト支払い方法',
        // Missing type field
      };

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createPaymentMethod = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/masters/payment-methods', {
        method: 'POST',
        body: JSON.stringify(validPaymentMethodData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});