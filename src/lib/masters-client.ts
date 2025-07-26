import type { PaymentMethod, PaymentMethodWithRelations, Card, Bank, APIResponse } from '@/types';

export class MasterService {
  static async getPaymentMethods(): Promise<APIResponse<PaymentMethodWithRelations[]>> {
    try {
      const response = await fetch('/api/masters/payment-methods?initialize=true');
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '支払い方法の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '支払い方法の取得に失敗しました' };
    }
  }

  static async createPaymentMethod(
    data: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<PaymentMethod>> {
    try {
      const response = await fetch('/api/masters/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '支払い方法の作成に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '支払い方法の作成に失敗しました' };
    }
  }

  static async updatePaymentMethod(
    id: string,
    data: Partial<Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<PaymentMethod>> {
    try {
      const response = await fetch(`/api/masters/payment-methods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '支払い方法の更新に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '支払い方法の更新に失敗しました' };
    }
  }

  static async getCards(): Promise<APIResponse<Card[]>> {
    try {
      const response = await fetch('/api/masters/cards');
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'カード情報の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'カード情報の取得に失敗しました' };
    }
  }

  static async createCard(
    data: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<Card>> {
    try {
      const response = await fetch('/api/masters/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'カード情報の作成に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'カード情報の作成に失敗しました' };
    }
  }

  static async updateCard(
    id: string,
    data: Partial<Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<Card>> {
    try {
      const response = await fetch(`/api/masters/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'カード情報の更新に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'カード情報の更新に失敗しました' };
    }
  }

  static async getBanks(): Promise<APIResponse<Bank[]>> {
    try {
      const response = await fetch('/api/masters/banks');
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '銀行情報の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '銀行情報の取得に失敗しました' };
    }
  }

  static async createBank(
    data: Omit<Bank, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<Bank>> {
    try {
      const response = await fetch('/api/masters/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '銀行情報の作成に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '銀行情報の作成に失敗しました' };
    }
  }

  static async updateBank(
    id: string,
    data: Partial<Omit<Bank, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<Bank>> {
    try {
      const response = await fetch(`/api/masters/banks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '銀行情報の更新に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '銀行情報の更新に失敗しました' };
    }
  }
}