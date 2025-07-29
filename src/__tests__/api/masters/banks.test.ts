import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/masters/banks/route';
import { MasterService } from '@/lib/masters';
import { auth } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/masters');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMasterService = MasterService as jest.Mocked<typeof MasterService>;

describe('/api/masters/banks', () => {
  const mockUserId = 'test-user-id';
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31',
  };

  const mockBank = {
    id: 'bank-1',
    name: 'テスト銀行',
    accountNumber: '1234567',
    branchName: '本店',
    isActive: true,
    userId: mockUserId,
    createdAt: '2025-07-28T23:55:27.119Z',
    updatedAt: '2025-07-28T23:55:27.119Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/masters/banks', () => {
    it('should return banks successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getBanks = jest.fn().mockResolvedValue({
        success: true,
        data: [mockBank],
      });

      const request = new NextRequest('http://localhost/api/masters/banks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([mockBank]);
      expect(mockMasterService.getBanks).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/banks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getBanks = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = new NextRequest('http://localhost/api/masters/banks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Database error');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.getBanks = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/masters/banks');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/masters/banks', () => {
    const validBankData = {
      name: 'テスト銀行',
      accountNumber: '1234567',
      branchName: '本店',
      isActive: true,
    };

    it('should create bank successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createBank = jest.fn().mockResolvedValue({
        success: true,
        data: mockBank,
      });

      const request = new NextRequest('http://localhost/api/masters/banks', {
        method: 'POST',
        body: JSON.stringify(validBankData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockBank);
      expect(mockMasterService.createBank).toHaveBeenCalledWith(mockUserId, {
        name: validBankData.name,
        accountNumber: validBankData.accountNumber,
        branchName: validBankData.branchName,
        isActive: validBankData.isActive,
      });
    });

    it('should create bank without optional fields', async () => {
      mockAuth.mockResolvedValue(mockSession);
      const bankWithoutOptionals = {
        ...mockBank,
        accountNumber: null,
        branchName: null,
        createdAt: '2025-07-28T23:55:27.119Z',
        updatedAt: '2025-07-28T23:55:27.119Z',
      };
      mockMasterService.createBank = jest.fn().mockResolvedValue({
        success: true,
        data: bankWithoutOptionals,
      });

      const minimalData = {
        name: 'テスト銀行',
        isActive: true,
      };

      const request = new NextRequest('http://localhost/api/masters/banks', {
        method: 'POST',
        body: JSON.stringify(minimalData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(bankWithoutOptionals);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/masters/banks', {
        method: 'POST',
        body: JSON.stringify(validBankData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when service fails', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockMasterService.createBank = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create bank',
      });

      const request = new NextRequest('http://localhost/api/masters/banks', {
        method: 'POST',
        body: JSON.stringify(validBankData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Failed to create bank');
    });

    it('should validate required fields', async () => {
      mockAuth.mockResolvedValue(mockSession);

      const incompleteData = {
        // Missing name field
        accountNumber: '1234567',
      };

      const request = new NextRequest('http://localhost/api/masters/banks', {
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
      mockMasterService.createBank = jest.fn().mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/masters/banks', {
        method: 'POST',
        body: JSON.stringify(validBankData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});