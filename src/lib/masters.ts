import { prisma } from './prisma';
import type { PaymentMethod, Card, Bank, APIResponse } from '@/types';

export class MasterService {
  static async getPaymentMethods(userId: string): Promise<APIResponse<PaymentMethod[]>> {
    try {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: paymentMethods };
    } catch (error) {
      console.error('Payment methods fetch error:', error);
      return { success: false, error: '支払い方法の取得に失敗しました' };
    }
  }

  static async createPaymentMethod(
    userId: string,
    data: Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<PaymentMethod>> {
    try {
      const paymentMethod = await prisma.paymentMethod.create({
        data: {
          ...data,
          userId,
        },
      });

      return { success: true, data: paymentMethod };
    } catch (error) {
      console.error('Payment method creation error:', error);
      return { success: false, error: '支払い方法の作成に失敗しました' };
    }
  }

  static async updatePaymentMethod(
    id: string,
    userId: string,
    data: Partial<Omit<PaymentMethod, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<PaymentMethod>> {
    try {
      const paymentMethod = await prisma.paymentMethod.update({
        where: { 
          id,
          userId,
        },
        data,
      });

      return { success: true, data: paymentMethod };
    } catch (error) {
      console.error('Payment method update error:', error);
      return { success: false, error: '支払い方法の更新に失敗しました' };
    }
  }

  static async getCards(userId: string): Promise<APIResponse<Card[]>> {
    try {
      const cards = await prisma.card.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          withdrawalBank: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: cards };
    } catch (error) {
      console.error('Cards fetch error:', error);
      return { success: false, error: 'カード情報の取得に失敗しました' };
    }
  }

  static async createCard(
    userId: string,
    data: Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<Card>> {
    try {
      const card = await prisma.card.create({
        data: {
          ...data,
          userId,
        },
        include: {
          withdrawalBank: true,
        },
      });

      return { success: true, data: card };
    } catch (error) {
      console.error('Card creation error:', error);
      return { success: false, error: 'カード情報の作成に失敗しました' };
    }
  }

  static async updateCard(
    id: string,
    userId: string,
    data: Partial<Omit<Card, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<Card>> {
    try {
      const card = await prisma.card.update({
        where: { 
          id,
          userId,
        },
        data,
        include: {
          withdrawalBank: true,
        },
      });

      return { success: true, data: card };
    } catch (error) {
      console.error('Card update error:', error);
      return { success: false, error: 'カード情報の更新に失敗しました' };
    }
  }

  static async getBanks(userId: string): Promise<APIResponse<Bank[]>> {
    try {
      const banks = await prisma.bank.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: banks };
    } catch (error) {
      console.error('Banks fetch error:', error);
      return { success: false, error: '銀行情報の取得に失敗しました' };
    }
  }

  static async createBank(
    userId: string,
    data: Omit<Bank, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<APIResponse<Bank>> {
    try {
      const bank = await prisma.bank.create({
        data: {
          ...data,
          userId,
        },
      });

      return { success: true, data: bank };
    } catch (error) {
      console.error('Bank creation error:', error);
      return { success: false, error: '銀行情報の作成に失敗しました' };
    }
  }

  static async updateBank(
    id: string,
    userId: string,
    data: Partial<Omit<Bank, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<APIResponse<Bank>> {
    try {
      const bank = await prisma.bank.update({
        where: { 
          id,
          userId,
        },
        data,
      });

      return { success: true, data: bank };
    } catch (error) {
      console.error('Bank update error:', error);
      return { success: false, error: '銀行情報の更新に失敗しました' };
    }
  }
}