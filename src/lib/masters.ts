import { prisma } from './prisma';
import type { PaymentMethod, PaymentMethodWithRelations, Card, Bank, APIResponse } from '@/types';

export class MasterService {
  static async getPaymentMethods(userId: string): Promise<APIResponse<PaymentMethodWithRelations[]>> {
    try {
      const paymentMethods = await prisma.paymentMethod.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          card: true,
          bank: true,
        },
        orderBy: { name: 'asc' },
      });

      return { success: true, data: paymentMethods };
    } catch (error) {
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
      return { success: false, error: '銀行情報の更新に失敗しました' };
    }
  }

  // 新しい支払い方法システム用メソッド
  static async initializePaymentMethods(userId: string): Promise<APIResponse<void>> {
    try {
      // 現金支払い方法を作成
      await prisma.paymentMethod.upsert({
        where: {
          userId_name: {
            userId,
            name: '現金',
          },
        },
        update: {},
        create: {
          userId,
          name: '現金',
          type: 'CASH',
          isActive: true,
        },
      });

      // カードマスタから支払い方法を生成
      const cards = await prisma.card.findMany({
        where: { userId, isActive: true },
      });

      for (const card of cards) {
        await prisma.paymentMethod.upsert({
          where: {
            userId_cardId: {
              userId,
              cardId: card.id,
            },
          },
          update: {},
          create: {
            userId,
            name: card.name,
            type: 'CARD',
            cardId: card.id,
            isActive: true,
          },
        });
      }

      // 銀行マスタから支払い方法を生成
      const banks = await prisma.bank.findMany({
        where: { userId, isActive: true },
      });

      for (const bank of banks) {
        await prisma.paymentMethod.upsert({
          where: {
            userId_bankId: {
              userId,
              bankId: bank.id,
            },
          },
          update: {},
          create: {
            userId,
            name: bank.name,
            type: 'BANK',
            bankId: bank.id,
            isActive: true,
          },
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '支払い方法の初期化に失敗しました' };
    }
  }

  static async getAvailablePaymentMethods(userId: string): Promise<APIResponse<PaymentMethodWithRelations[]>> {
    try {
      // 支払い方法を初期化
      await this.initializePaymentMethods(userId);
      
      // 初期化後の支払い方法を取得
      return await this.getPaymentMethods(userId);
    } catch (error) {
      return { success: false, error: '利用可能な支払い方法の取得に失敗しました' };
    }
  }
}