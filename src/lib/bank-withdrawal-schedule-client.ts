import type { APIResponse } from '@/types';

export interface BankWithdrawalScheduleData {
  banks: { id: string; name: string }[];
  schedule: {
    year: number;
    month: number;
    date: string;
    withdrawals: {
      bankId: string;
      bankName: string;
      amount: number;
      transactions: {
        id: string;
        store: string;
        purpose: string;
        amount: number;
        cardName?: string;
      }[];
    }[];
  }[];
}

export interface BankWithdrawalScheduleFilter {
  startDate?: Date;
  endDate?: Date;
}

export class BankWithdrawalScheduleService {
  /**
   * 銀行別引き落とし予定一覧を取得
   */
  static async getBankWithdrawalSchedule(
    filter: BankWithdrawalScheduleFilter = {}
  ): Promise<APIResponse<BankWithdrawalScheduleData>> {
    try {
      const params = new URLSearchParams();
      
      if (filter.startDate) {
        params.append('startDate', filter.startDate.toISOString().split('T')[0]);
      }
      if (filter.endDate) {
        params.append('endDate', filter.endDate.toISOString().split('T')[0]);
      }

      const url = `/api/bank-withdrawal-schedule${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch bank withdrawal schedule:', error);
      return {
        success: false,
        error: 'Failed to fetch bank withdrawal schedule',
      };
    }
  }
}