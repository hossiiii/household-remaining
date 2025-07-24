import { prisma } from './prisma';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilter,
  PaginatedResponse,
  PaginationParams,
  APIResponse
} from '@/types';

export class TransactionService {
  static async createTransaction(data: TransactionFormData & { userId: string }): Promise<APIResponse<Transaction>> {
    try {
      const transactionData = {
        userId: data.userId,
        date: new Date(data.date),
        dayOfWeek: new Date(data.date).toLocaleDateString('ja-JP', { weekday: 'short' }),
        paymentMethodId: data.paymentMethodId,
        store: data.store,
        purpose: data.purpose,
        type: data.type.toUpperCase() as 'INCOME' | 'EXPENSE',
        amount: data.amount,
      };

      const transaction = await prisma.transaction.create({
        data: transactionData,
        include: {
          paymentMethod: true,
        },
      });

      return { success: true, data: transaction };
    } catch (error) {
      console.error('Transaction creation error:', error);
      return { success: false, error: '取引の作成に失敗しました' };
    }
  }

  static async getTransactions(
    userId: string,
    filter: TransactionFilter = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<APIResponse<PaginatedResponse<Transaction>>> {
    try {
      const where: any = {
        userId,
      };

      if (filter.startDate) {
        where.date = { gte: filter.startDate };
      }
      if (filter.endDate) {
        where.date = { ...where.date, lte: filter.endDate };
      }
      if (filter.paymentMethodId) {
        where.paymentMethodId = filter.paymentMethodId;
      }
      if (filter.type && filter.type !== 'all') {
        where.type = filter.type.toUpperCase();
      }
      if (filter.store) {
        where.store = { contains: filter.store, mode: 'insensitive' };
      }
      if (filter.purpose) {
        where.purpose = { contains: filter.purpose, mode: 'insensitive' };
      }

      const total = await prisma.transaction.count({ where });

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          paymentMethod: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      });

      const totalPages = Math.ceil(total / pagination.limit);

      return {
        success: true,
        data: {
          data: transactions,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrev: pagination.page > 1,
          },
        },
      };
    } catch (error) {
      console.error('Transaction fetch error:', error);
      return { success: false, error: '取引の取得に失敗しました' };
    }
  }

  static async updateTransaction(
    id: string,
    userId: string,
    data: Partial<TransactionFormData>
  ): Promise<APIResponse<Transaction>> {
    try {
      const updateData: any = {};
      
      if (data.date) {
        updateData.date = new Date(data.date);
        updateData.dayOfWeek = new Date(data.date).toLocaleDateString('ja-JP', { weekday: 'short' });
      }
      if (data.paymentMethodId) updateData.paymentMethodId = data.paymentMethodId;
      if (data.store !== undefined) updateData.store = data.store;
      if (data.purpose !== undefined) updateData.purpose = data.purpose;
      if (data.type) updateData.type = data.type.toUpperCase();
      if (data.amount !== undefined) updateData.amount = data.amount;

      const transaction = await prisma.transaction.update({
        where: { 
          id,
          userId,
        },
        data: updateData,
        include: {
          paymentMethod: true,
        },
      });

      return { success: true, data: transaction };
    } catch (error) {
      console.error('Transaction update error:', error);
      return { success: false, error: '取引の更新に失敗しました' };
    }
  }

  static async deleteTransaction(id: string, userId: string): Promise<APIResponse<void>> {
    try {
      await prisma.transaction.delete({
        where: { 
          id,
          userId,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Transaction deletion error:', error);
      return { success: false, error: '取引の削除に失敗しました' };
    }
  }

  static async getTransactionById(id: string, userId: string): Promise<APIResponse<Transaction>> {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { 
          id,
          userId,
        },
        include: {
          paymentMethod: true,
        },
      });

      if (!transaction) {
        return { success: false, error: '取引が見つかりません' };
      }

      return { success: true, data: transaction };
    } catch (error) {
      console.error('Transaction fetch error:', error);
      return { success: false, error: '取引の取得に失敗しました' };
    }
  }
}