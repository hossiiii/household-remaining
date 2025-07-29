import type {
  Transaction,
  TransactionFormData,
  TransactionFilter,
  TransactionWithHistoricalBalance,
  PaginatedResponse,
  PaginationParams,
  APIResponse
} from '@/types';

export class TransactionService {
  static async createTransaction(data: TransactionFormData): Promise<APIResponse<Transaction>> {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '取引の作成に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '取引の作成に失敗しました' };
    }
  }

  static async getTransactions(
    filter: TransactionFilter = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<APIResponse<PaginatedResponse<Transaction>>> {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
      if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

      if (filter.type) params.append('type', filter.type);
      if (filter.paymentMethodId) params.append('paymentMethodId', filter.paymentMethodId);
      if (filter.store) params.append('store', filter.store);
      if (filter.purpose) params.append('purpose', filter.purpose);
      if (filter.startDate) params.append('startDate', filter.startDate.toISOString());
      if (filter.endDate) params.append('endDate', filter.endDate.toISOString());

      const response = await fetch(`/api/transactions?${params}`);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '取引の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '取引の取得に失敗しました' };
    }
  }

  static async updateTransaction(
    id: string,
    data: Partial<TransactionFormData>
  ): Promise<APIResponse<Transaction>> {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '取引の更新に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '取引の更新に失敗しました' };
    }
  }

  static async deleteTransaction(id: string): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '取引の削除に失敗しました' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: '取引の削除に失敗しました' };
    }
  }

  static async getTransactionById(id: string): Promise<APIResponse<Transaction>> {
    try {
      const response = await fetch(`/api/transactions/${id}`);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '取引の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '取引の取得に失敗しました' };
    }
  }

  static async getTransactionsWithHistoricalBalance(
    filter: TransactionFilter = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<APIResponse<{
    transactions: TransactionWithHistoricalBalance[];
    banks: { id: string; name: string }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        withHistoricalBalance: 'true',
      });

      if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
      if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

      if (filter.type) params.append('type', filter.type);
      if (filter.paymentMethodId) params.append('paymentMethodId', filter.paymentMethodId);
      if (filter.store) params.append('store', filter.store);
      if (filter.purpose) params.append('purpose', filter.purpose);
      if (filter.startDate) params.append('startDate', filter.startDate.toISOString());
      if (filter.endDate) params.append('endDate', filter.endDate.toISOString());

      const response = await fetch(`/api/transactions?${params}`);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || '履歴残高付き取引の取得に失敗しました' };
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: '履歴残高付き取引の取得に失敗しました' };
    }
  }
}