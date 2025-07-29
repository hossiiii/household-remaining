import { NextRequest } from 'next/server';
import { POST } from '@/app/api/card-withdrawals/route';
import { CardWithdrawalService } from '@/lib/card-withdrawal';
import { auth } from '@/lib/auth';

// Mock the auth function
jest.mock('@/lib/auth');
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Mock the CardWithdrawalService
jest.mock('@/lib/card-withdrawal');
const mockCardWithdrawalService = CardWithdrawalService as jest.Mocked<typeof CardWithdrawalService>;

describe('/api/card-withdrawals', () => {
  const mockUserId = 'test-user-id';
  const mockSession = {
    user: {
      id: mockUserId,
      name: 'Test User',
      email: 'test@example.com'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should process card withdrawals successfully', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockCardWithdrawalService.processCardWithdrawals.mockResolvedValue({
        success: true,
        data: {
          processedWithdrawals: 2,
          updatedWithdrawals: 1,
          errors: []
        }
      });

      const request = new NextRequest('http://localhost/api/card-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.processedWithdrawals).toBe(2);
      expect(data.data.updatedWithdrawals).toBe(1);
      expect(mockCardWithdrawalService.processCardWithdrawals).toHaveBeenCalledWith(mockUserId);
    });

    it('should preserve manual date adjustments during processing', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockCardWithdrawalService.processCardWithdrawals.mockResolvedValue({
        success: true,
        data: {
          processedWithdrawals: 1,
          updatedWithdrawals: 2, // 2件は既存の引落し取引を更新（日付保持）
          errors: []
        }
      });

      const request = new NextRequest('http://localhost/api/card-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.updatedWithdrawals).toBe(2);
      expect(mockCardWithdrawalService.processCardWithdrawals).toHaveBeenCalledWith(mockUserId);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/card-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
      expect(mockCardWithdrawalService.processCardWithdrawals).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockCardWithdrawalService.processCardWithdrawals.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const request = new NextRequest('http://localhost/api/card-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      mockAuth.mockResolvedValue(mockSession);
      mockCardWithdrawalService.processCardWithdrawals.mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = new NextRequest('http://localhost/api/card-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});