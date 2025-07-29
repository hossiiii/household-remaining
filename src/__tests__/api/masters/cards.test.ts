import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/masters/cards/route';
import { MasterService } from '@/lib/masters';
import { auth } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/masters');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMasterService = MasterService as jest.Mocked<typeof MasterService>;

describe('/api/masters/cards', () => {
  const mockUserId = 'test-user-id';
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31',
  };

  const mockCard = {
    id: 'card-1',
    name: 'テストカード',
    type: 'CREDIT_CARD' as const,
    closingDay: 15,
    withdrawalDay: 10,
    withdrawalMonthOffset: 1,
    withdrawalBankId: 'bank-1',
    isActive: true,
    userId: mockUserId,
    createdAt: '2025-07-28T23:55:58.136Z',
    updatedAt: '2025-07-28T23:55:58.136Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/masters/cards', () => {
    it('should return cards successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getCards = jest.fn().mockResolvedValue({
        success: true,
        data: [mockCard],
      });

      const request = new NextRequest('http://localhost/api/masters/cards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockCard]);
      expect(mockMasterService.getCards).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/cards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getCards = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = new NextRequest('http://localhost/api/masters/cards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getCards = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/masters/cards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/masters/cards', () => {
    const validCardData = {
      name: 'テストカード',
      type: 'CREDIT_CARD',
      closingDay: 15,
      withdrawalDay: 10,
      withdrawalMonthOffset: 1,
      withdrawalBankId: 'bank-1',
      isActive: true,
    };

    it('should create card successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createCard = jest.fn().mockResolvedValue({
        success: true,
        data: mockCard,
      });

      const request = new NextRequest('http://localhost/api/masters/cards', {
        method: 'POST',
        body: JSON.stringify(validCardData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCard);
      expect(mockMasterService.createCard).toHaveBeenCalledWith(mockUserId, {
        name: validCardData.name,
        type: validCardData.type,
        closingDay: validCardData.closingDay,
        withdrawalDay: validCardData.withdrawalDay,
        withdrawalMonthOffset: validCardData.withdrawalMonthOffset,
        withdrawalBankId: validCardData.withdrawalBankId,
        isActive: validCardData.isActive,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/cards', {
        method: 'POST',
        body: JSON.stringify(validCardData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 when validation fails', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const invalidData = {
        ...validCardData,
        closingDay: 0, // Invalid closing day
      };

      const request = new NextRequest('http://localhost/api/masters/cards', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createCard = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create card',
      });

      const request = new NextRequest('http://localhost/api/masters/cards', {
        method: 'POST',
        body: JSON.stringify(validCardData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create card');
    });

    it('should validate required fields', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const incompleteData = {
        name: 'テストカード',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost/api/masters/cards', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate withdrawalMonthOffset values', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const invalidData = {
        ...validCardData,
        withdrawalMonthOffset: 3, // Invalid value (should be 1 or 2)
      };

      const request = new NextRequest('http://localhost/api/masters/cards', {
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